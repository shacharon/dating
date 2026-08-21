import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailRecipientHelper } from './email-recipient.helper';
import { REJECTION_REASON_USER_COPY_EN } from '../photo-storage/photo-moderation.types';
import { buildPhotoRejectionEmail } from './email-templates';
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
    const recipients = new EmailRecipientHelper(prisma, obs);
    service = new PhotoRejectionEmailService(recipients, config, email, obs);
  });

  it('skips when email notifications disabled', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
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
    expect(obs.trace).toHaveBeenCalledWith(
      'email photo rejection skipped unsubscribed userId=u1',
      expect.any(String),
    );
  });

  it('sends friendly copy for rejection code', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      emailNotificationsEnabled: true,
    });

    await service.sendBestEffort({
      userId: 'u1',
      photoId: 'p1',
      rejectionReasonCode: 'explicit_content',
    });

    const expected = buildPhotoRejectionEmail({
      reason: REJECTION_REASON_USER_COPY_EN.explicit_content,
      url: 'http://localhost:3000/dating/profile#profile-photos',
    });
    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        to: 'a@b.com',
        subject: expected.subject,
        textBody: expected.textBody,
        htmlBody: expected.htmlBody,
      }),
    );
  });
});
