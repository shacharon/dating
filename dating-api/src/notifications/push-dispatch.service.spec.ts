import { ErrorCodes } from '../logging/error-codes';
import { PushDispatchService } from './push-dispatch.service';
import type { PushNotificationConfigService } from './push-notification-config.service';
import type { PushNotificationProvider } from './push-notification.port';
import type { IDeviceTokenRepository } from './repositories/device-token.repository';
import type { PrismaService } from '../prisma/prisma.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';

describe('PushDispatchService', () => {
  const config = {
    isSendingEnabled: true,
  } as unknown as PushNotificationConfigService;

  const pushProvider: PushNotificationProvider = {
    send: jest.fn().mockResolvedValue(undefined),
    sendBatch: jest.fn().mockResolvedValue(undefined),
  };

  const deviceTokens: IDeviceTokenRepository = {
    upsert: jest.fn(),
    findByUserId: jest.fn(),
    deleteForUser: jest.fn(),
  };

  const prisma = {
    user: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: PushDispatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    (config as { isSendingEnabled: boolean }).isSendingEnabled = true;
    service = new PushDispatchService(
      config,
      pushProvider,
      deviceTokens,
      prisma,
      obs,
    );
  });

  const payload = {
    title: 'New message from Sam',
    body: 'Hi',
    data: { type: 'new_message', conversationId: 'c1' },
  };

  it('skips when provider disabled', async () => {
    (config as { isSendingEnabled: boolean }).isSendingEnabled = false;

    await service.sendToUser('u1', payload);

    expect(pushProvider.sendBatch).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('provider disabled'),
      ErrorCodes.PUSH_SKIPPED_PROVIDER_DISABLED,
    );
  });

  it('skips when in-app prefs disabled', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      inAppNotificationsEnabled: false,
    });

    await service.sendToUser('u1', payload);

    expect(deviceTokens.findByUserId).not.toHaveBeenCalled();
    expect(pushProvider.sendBatch).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('prefs off'),
      ErrorCodes.PUSH_SKIPPED_PREFS_DISABLED,
    );
  });

  it('skips when user missing (prefs gate)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await service.sendToUser('u1', payload);

    expect(pushProvider.sendBatch).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('prefs off'),
      ErrorCodes.PUSH_SKIPPED_PREFS_DISABLED,
    );
  });

  it('skips when no devices registered', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      inAppNotificationsEnabled: true,
    });
    (deviceTokens.findByUserId as jest.Mock).mockResolvedValue([]);

    await service.sendToUser('u1', payload);

    expect(pushProvider.sendBatch).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('no devices'),
      ErrorCodes.PUSH_SKIPPED_NO_DEVICES,
    );
  });

  it('sends batch to all device tokens', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      inAppNotificationsEnabled: true,
    });
    (deviceTokens.findByUserId as jest.Mock).mockResolvedValue([
      { token: 'tok-a', platform: 'android' },
      { token: 'tok-b', platform: 'ios' },
    ]);

    await service.sendToUser('u1', payload);

    expect(pushProvider.sendBatch).toHaveBeenCalledWith(
      ['tok-a', 'tok-b'],
      payload,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('push send ok'),
      ErrorCodes.PUSH_SEND_OK,
    );
  });

  it('swallows provider errors', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      inAppNotificationsEnabled: true,
    });
    (deviceTokens.findByUserId as jest.Mock).mockResolvedValue([
      { token: 'tok-a', platform: 'android' },
    ]);
    (pushProvider.sendBatch as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(service.sendToUser('u1', payload)).resolves.toBeUndefined();

    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('push send failed'),
      ErrorCodes.PUSH_SEND_FAILED,
      expect.any(Error),
    );
  });
});
