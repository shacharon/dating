import { MutualMatchStatus, type MutualMatch } from '@prisma/client';
import { ErrorCodes } from '../logging/error-codes';
import { MutualMatchEmailService } from './mutual-match-email.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';
import type { EmailNotificationService } from './email-notification.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailRecipientHelper } from './email-recipient.helper';

describe('MutualMatchEmailService', () => {
  const match: MutualMatch = {
    id: 'mutual_1',
    userId1: 'user_a',
    userId2: 'user_b',
    status: MutualMatchStatus.ACTIVE,
    createdAt: new Date('2026-06-01T10:00:00.000Z'),
    unmatchedAt: null,
    unmatchedByUserId: null,
    user1LastReadAt: null,
    user2LastReadAt: null,
  };

  const prisma = {
    user: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const config = {
    appPublicUrl: 'http://localhost:3000',
  } as EmailNotificationConfigService;

  const email = {
    sendTransactionalBestEffort: jest.fn().mockResolvedValue(undefined),
  } as unknown as EmailNotificationService;

  const obs = {
    trace: jest.fn(),
    error: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let service: MutualMatchEmailService;

  beforeEach(() => {
    jest.clearAllMocks();
    const recipients = new EmailRecipientHelper(prisma, obs);
    service = new MutualMatchEmailService(recipients, config, email, obs);
  });

  function mockUsers(
    user1: Record<string, unknown>,
    user2: Record<string, unknown>,
  ) {
    (prisma.user.findUnique as jest.Mock).mockImplementation(
      async ({ where }: { where: { id: string } }) => {
        if (where.id === 'user_a') return user1;
        if (where.id === 'user_b') return user2;
        return null;
      },
    );
  }

  it('sends to both users when notifications enabled', async () => {
    mockUsers(
      {
        id: 'user_a',
        email: 'a@example.com',
        displayName: 'Alice',
        emailNotificationsEnabled: true,
        profile: { nickname: 'Alice' },
      },
      {
        id: 'user_b',
        email: 'b@example.com',
        displayName: 'Bob',
        emailNotificationsEnabled: true,
        profile: { nickname: 'Bob' },
      },
    );

    await service.notifyNewMutualMatchBestEffort(match);

    expect(email.sendTransactionalBestEffort).toHaveBeenCalledTimes(2);
    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_a',
        to: 'a@example.com',
        subject: "It's a match on Piza!",
        okCode: ErrorCodes.EMAIL_MUTUAL_MATCH_SEND_OK,
      }),
    );
    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_b',
        to: 'b@example.com',
        textBody: expect.stringContaining('Alice'),
      }),
    );
  });

  it('skips unsubscribed users without sending', async () => {
    mockUsers(
      {
        id: 'user_a',
        email: 'a@example.com',
        displayName: 'Alice',
        emailNotificationsEnabled: false,
        profile: { nickname: 'Alice' },
      },
      {
        id: 'user_b',
        email: 'b@example.com',
        displayName: 'Bob',
        emailNotificationsEnabled: true,
        profile: { nickname: 'Bob' },
      },
    );

    await service.notifyNewMutualMatchBestEffort(match);

    expect(email.sendTransactionalBestEffort).toHaveBeenCalledTimes(1);
    expect(obs.trace).toHaveBeenCalledWith(
      'email mutual match skipped unsubscribed userId=user_a',
      ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
    );
  });

  it('skips users with empty email without sending', async () => {
    mockUsers(
      {
        id: 'user_a',
        email: '   ',
        displayName: 'Alice',
        emailNotificationsEnabled: true,
        profile: { nickname: 'Alice' },
      },
      {
        id: 'user_b',
        email: 'b@example.com',
        displayName: 'Bob',
        emailNotificationsEnabled: true,
        profile: { nickname: 'Bob' },
      },
    );

    await service.notifyNewMutualMatchBestEffort(match);

    expect(email.sendTransactionalBestEffort).toHaveBeenCalledTimes(1);
    expect(email.sendTransactionalBestEffort).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_b',
        to: 'b@example.com',
      }),
    );
  });

  it('does not include message body in email text', async () => {
    mockUsers(
      {
        id: 'user_a',
        email: 'a@example.com',
        displayName: null,
        emailNotificationsEnabled: true,
        profile: { nickname: 'Alice' },
      },
      {
        id: 'user_b',
        email: 'b@example.com',
        displayName: null,
        emailNotificationsEnabled: true,
        profile: { nickname: 'Bob' },
      },
    );

    await service.notifyNewMutualMatchBestEffort(match);

    for (const call of (email.sendTransactionalBestEffort as jest.Mock).mock
      .calls) {
      const params = call[0];
      expect(params.textBody).not.toMatch(/secret message/i);
      expect(params.textBody).toContain('/dating/conversations/mutual_1');
    }
  });
});
