import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PhotoRejectionEmailService } from './photo-rejection-email.service';

describe('PhotoRejectionEmailService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const config = {
    appPublicUrl: 'http://localhost:3000',
  } as unknown as EmailNotificationConfigService;

  const email = {
    sendTransactionalBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailNotificationService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: PhotoRejectionEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PhotoRejectionEmailService(prisma, config, email, obs);
  });

  it('skips when email notifications disabled', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      emailNotificationsEnabled: false,
    });

    await service.sendBestEffort({
      userId: 'u1',
      photoId: 'p1',
      rejectionReasonCode: 'no_face',
    });

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalled();
  });

  it('sends friendly copy for rejection code', async () => {
    prisma.user.findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      emailNotificationsEnabled: true,
    });

    await service.sendBestEffort({
      userId: 'u1',
      photoId: 'p1',
      rejectionReasonCode: 'explicit_content',
    });

    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        to: 'a@b.com',
        subject: 'Your photo was not approved',
        textBody: expect.stringContaining('community guidelines'),
      }),
    );
  });
});
