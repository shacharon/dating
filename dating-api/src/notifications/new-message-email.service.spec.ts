import { ErrorCodes } from '../logging/error-codes';
import { NewMessageEmailService } from './new-message-email.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import type { MessageEmailDebounceService } from './message-email-debounce.service';
import type { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailRecipientHelper } from './email-recipient.helper';

describe('NewMessageEmailService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const config = {
    appPublicUrl: 'http://localhost:3000',
  } as EmailNotificationConfigService;

  const socketRegistry = {
    hasActiveConnection: jest.fn(),
  } as unknown as MessagingSocketRegistry;

  const debounce = {
    shouldSend: jest.fn(),
    recordSent: jest.fn(),
  } as unknown as MessageEmailDebounceService;

  const email = {
    sendTransactionalBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailNotificationService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: NewMessageEmailService;

  const baseParams = {
    conversationId: 'conv_1',
    recipientUserId: 'user_recipient',
    senderUserId: 'user_sender',
    messageId: 'msg_1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const recipients = new EmailRecipientHelper(prisma, obs);
    service = new NewMessageEmailService(
      recipients,
      config,
      socketRegistry,
      debounce,
      email,
      obs,
    );
    (debounce.shouldSend as jest.Mock).mockReturnValue(true);
    (socketRegistry.hasActiveConnection as jest.Mock).mockReturnValue(false);
  });

  it('skips when recipient has active WS connection', async () => {
    (socketRegistry.hasActiveConnection as jest.Mock).mockReturnValue(true);

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('user_recipient'),
      ErrorCodes.EMAIL_SKIPPED_RECIPIENT_ONLINE,
    );
  });

  it('skips when debounce window is active', async () => {
    (debounce.shouldSend as jest.Mock).mockReturnValue(false);

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('conv_1'),
      ErrorCodes.EMAIL_SKIPPED_DEBOUNCED,
    );
  });

  it('skips when recipient unsubscribed', async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (where.id === 'user_recipient') {
          return {
            id: 'user_recipient',
            email: 'r@example.com',
            emailNotificationsEnabled: false,
          };
        }
        return {
          id: 'user_sender',
          email: 's@example.com',
          displayName: 'Sender',
          emailNotificationsEnabled: true,
          profile: { nickname: 'Sender' },
        };
      },
    );

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      'email message skipped unsubscribed userId=user_recipient',
      ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
    );
  });

  it('sends when recipient offline and subscribed', async () => {
    (prisma.user.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (where.id === 'user_recipient') {
          return {
            id: 'user_recipient',
            email: 'r@example.com',
            emailNotificationsEnabled: true,
          };
        }
        return {
          id: 'user_sender',
          email: 's@example.com',
          displayName: null,
          emailNotificationsEnabled: true,
          profile: { nickname: 'SenderNick' },
        };
      },
    );

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_recipient',
        to: 'r@example.com',
        subject: 'New message on Piza',
        textBody: expect.stringContaining('SenderNick'),
        okCode: ErrorCodes.EMAIL_MESSAGE_SEND_OK,
      }),
    );
    expect(debounce.recordSent).toHaveBeenCalledWith(
      'conv_1',
      'user_recipient',
    );
  });
});
