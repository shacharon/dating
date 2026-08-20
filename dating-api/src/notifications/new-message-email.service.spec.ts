import { ErrorCodes } from '../logging/error-codes';
import { NewMessageEmailService } from './new-message-email.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import type { MessageEmailDebounceService } from './message-email-debounce.service';
import type { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';

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
    tryClaimSend: jest.fn(),
    releaseClaim: jest.fn(),
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
    service = new NewMessageEmailService(
      prisma,
      config,
      socketRegistry,
      debounce,
      email,
      obs,
    );
    (debounce.tryClaimSend as jest.Mock).mockResolvedValue(true);
    (debounce.releaseClaim as jest.Mock).mockResolvedValue(undefined);
    (socketRegistry.hasActiveConnection as jest.Mock).mockResolvedValue(false);
  });

  it('skips when recipient has active WS connection (no debounce claim)', async () => {
    (socketRegistry.hasActiveConnection as jest.Mock).mockResolvedValue(true);

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(debounce.tryClaimSend).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('user_recipient'),
      ErrorCodes.EMAIL_SKIPPED_RECIPIENT_ONLINE,
    );
  });

  it('skips when debounce claim fails', async () => {
    (debounce.tryClaimSend as jest.Mock).mockResolvedValue(false);
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
          displayName: 'Sender',
          profile: { nickname: 'Sender' },
        };
      },
    );

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('conv_1'),
      ErrorCodes.EMAIL_SKIPPED_DEBOUNCED,
    );
  });

  it('skips when recipient unsubscribed without claiming', async () => {
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
          displayName: 'Sender',
          profile: { nickname: 'Sender' },
        };
      },
    );

    await service.maybeNotifyBestEffort(baseParams);

    expect(email.sendTransactionalBestEffort).not.toHaveBeenCalled();
    expect(debounce.tryClaimSend).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('user_recipient'),
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
          displayName: null,
          profile: { nickname: 'SenderNick' },
        };
      },
    );

    await service.maybeNotifyBestEffort(baseParams);

    expect(debounce.tryClaimSend).toHaveBeenCalledWith(
      'conv_1',
      'user_recipient',
    );
    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_recipient',
        to: 'r@example.com',
        subject: 'New message on Piza',
        textBody: expect.stringContaining('SenderNick'),
        okCode: ErrorCodes.EMAIL_MESSAGE_SEND_OK,
      }),
    );
    expect(debounce.releaseClaim).not.toHaveBeenCalled();
  });

  it('releases claim when send throws', async () => {
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
          displayName: 'Sender',
          profile: { nickname: 'Sender' },
        };
      },
    );
    (email.sendTransactionalBestEffort as jest.Mock).mockRejectedValue(
      new Error('boom'),
    );

    await service.maybeNotifyBestEffort(baseParams);

    expect(debounce.releaseClaim).toHaveBeenCalledWith(
      'conv_1',
      'user_recipient',
    );
    expect(obs.error).toHaveBeenCalled();
  });
});
