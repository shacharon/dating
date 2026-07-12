import { UserStatus } from '@prisma/client';
import { ReferralAttributionService } from './referral-attribution.service';
import type { UsersService } from '../users/users.service';

describe('ReferralAttributionService', () => {
  const users = {
    findById: jest.fn(),
  } as unknown as UsersService;

  let service: ReferralAttributionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReferralAttributionService(users);
  });

  it('returns null for empty ref', async () => {
    await expect(service.resolveReferrerUserId(undefined, 'new-1')).resolves.toBeNull();
    await expect(service.resolveReferrerUserId('  ', 'new-1')).resolves.toBeNull();
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('returns null for self-ref', async () => {
    await expect(
      service.resolveReferrerUserId('user_self', 'user_self'),
    ).resolves.toBeNull();
    expect(users.findById).not.toHaveBeenCalled();
  });

  it('returns null when referrer not found', async () => {
    (users.findById as jest.Mock).mockResolvedValue(null);
    await expect(
      service.resolveReferrerUserId('user_missing', 'new-1'),
    ).resolves.toBeNull();
  });

  it('returns null when referrer is deleted', async () => {
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_deleted',
      status: UserStatus.ACTIVE,
      deletedAt: new Date(),
    });
    await expect(
      service.resolveReferrerUserId('user_deleted', 'new-1'),
    ).resolves.toBeNull();
  });

  it('returns null when referrer is not ACTIVE', async () => {
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_disabled',
      status: UserStatus.DISABLED,
      deletedAt: null,
    });
    await expect(
      service.resolveReferrerUserId('user_disabled', 'new-1'),
    ).resolves.toBeNull();
  });

  it('returns referrer id when valid', async () => {
    (users.findById as jest.Mock).mockResolvedValue({
      id: 'user_referrer',
      status: UserStatus.ACTIVE,
      deletedAt: null,
    });
    await expect(
      service.resolveReferrerUserId('user_referrer', 'new-1'),
    ).resolves.toBe('user_referrer');
  });
});
