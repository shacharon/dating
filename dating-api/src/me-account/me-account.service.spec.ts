import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import type { AnalyticsService } from '../analytics/analytics.service';
import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PhotoStorage } from '../photo-storage/photo-storage.types';
import {
  MeAccountService,
  scrubbedDeletedUserEmail,
  scrubbedDeletedUserGoogleId,
} from './me-account.service';
import type { IAccountRepository } from './repositories/account.repository';

describe('account scrub identifiers', () => {
  it('builds deterministic deleted-user identifiers', () => {
    expect(scrubbedDeletedUserEmail('user-abc')).toBe(
      'deleted+user-abc@deleted.invalid',
    );
    expect(scrubbedDeletedUserGoogleId('user-abc')).toBe('deleted+user-abc');
  });
});

describe('MeAccountService', () => {
  let accounts: jest.Mocked<IAccountRepository>;
  let obs: jest.Mocked<Pick<StructuredObservabilityService, 'trace'>>;
  let analytics: jest.Mocked<Pick<AnalyticsService, 'track'>>;
  let photoStorage: jest.Mocked<Pick<PhotoStorage, 'delete'>>;
  let service: MeAccountService;

  beforeEach(() => {
    accounts = {
      findActiveUser: jest.fn(),
      findProfileIdByUserId: jest.fn().mockResolvedValue(null),
      listPhotoStorageKeys: jest.fn().mockResolvedValue([]),
      scrubAndSoftDeleteAccount: jest.fn().mockResolvedValue(undefined),
    };
    obs = { trace: jest.fn() };
    analytics = { track: jest.fn() };
    photoStorage = { delete: jest.fn().mockResolvedValue(undefined) };
    service = new MeAccountService(
      accounts,
      obs as unknown as StructuredObservabilityService,
      analytics as unknown as AnalyticsService,
      photoStorage as unknown as PhotoStorage,
    );
  });

  it('rejects invalid confirmation before repository calls', async () => {
    await expect(
      service.deleteAccountForUser('user-1', 'delete'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(accounts.findActiveUser).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('returns 404 when the user is missing or deleted', async () => {
    accounts.findActiveUser.mockResolvedValue({
      id: 'user-1',
      deletedAt: new Date(),
    });

    await expect(
      service.deleteAccountForUser('user-1', 'DELETE'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(accounts.scrubAndSoftDeleteAccount).not.toHaveBeenCalled();
  });

  it('tracks analytics and delegates the DB scrub to the account port', async () => {
    const now = new Date('2026-08-21T10:00:00.000Z');
    jest.useFakeTimers({ now });
    accounts.findActiveUser.mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    accounts.findProfileIdByUserId.mockResolvedValue('prof-1');

    await service.deleteAccountForUser('user-1', 'DELETE');

    expect(analytics.track).toHaveBeenCalledWith(
      'user-1',
      ProductAnalyticsEvents.ACCOUNT_DELETED,
      {},
    );
    expect(accounts.scrubAndSoftDeleteAccount).toHaveBeenCalledWith({
      userId: 'user-1',
      profileId: 'prof-1',
      now,
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('account deleted'),
      ErrorCodes.ACCOUNT_DELETE_SUCCESS,
    );
    jest.useRealTimers();
  });

  it('deletes photo storage before delegating the DB scrub', async () => {
    const order: string[] = [];
    accounts.findActiveUser.mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    accounts.findProfileIdByUserId.mockResolvedValue('prof-1');
    accounts.listPhotoStorageKeys.mockResolvedValue([
      { id: 'photo-1', storageKey: 'photos/1.jpg' },
    ]);
    photoStorage.delete.mockImplementation(async () => {
      order.push('storage');
    });
    accounts.scrubAndSoftDeleteAccount.mockImplementation(async () => {
      order.push('database');
    });

    await service.deleteAccountForUser('user-1', 'DELETE');

    expect(order).toEqual(['storage', 'database']);
  });

  it('logs storage failures and still scrubs the database', async () => {
    accounts.findActiveUser.mockResolvedValue({
      id: 'user-1',
      deletedAt: null,
    });
    accounts.findProfileIdByUserId.mockResolvedValue('prof-1');
    accounts.listPhotoStorageKeys.mockResolvedValue([
      { id: 'photo-1', storageKey: 'photos/1.jpg' },
    ]);
    photoStorage.delete.mockRejectedValue(new Error('s3 down'));

    await service.deleteAccountForUser('user-1', 'DELETE');

    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('photoId=photo-1'),
      ErrorCodes.ACCOUNT_DELETE_PHOTO_STORAGE_FAILED,
    );
    expect(accounts.scrubAndSoftDeleteAccount).toHaveBeenCalled();
  });
});
