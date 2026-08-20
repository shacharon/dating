import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { EmailRecipientHelper } from './email-recipient.helper';

describe('EmailRecipientHelper', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
  } as unknown as PrismaService;

  const obs = {
    trace: jest.fn(),
  } as unknown as StructuredObservabilityService;

  let helper: EmailRecipientHelper;

  beforeEach(() => {
    jest.clearAllMocks();
    helper = new EmailRecipientHelper(prisma, obs);
  });

  it('loadRecipient selects id email notifications flag', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      emailNotificationsEnabled: true,
    });

    await expect(helper.loadRecipient('u1')).resolves.toEqual({
      id: 'u1',
      email: 'a@b.com',
      emailNotificationsEnabled: true,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: {
        id: true,
        email: true,
        emailNotificationsEnabled: true,
      },
    });
  });

  it('loadUserWithLabel includes displayName and profile.nickname', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      displayName: 'A',
      emailNotificationsEnabled: true,
      profile: { nickname: 'Nick' },
    });

    await helper.loadUserWithLabel('u1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: {
        id: true,
        email: true,
        displayName: true,
        emailNotificationsEnabled: true,
        profile: { select: { nickname: true } },
      },
    });
  });

  it('shouldSkipUnsubscribed returns false when enabled', () => {
    expect(
      helper.shouldSkipUnsubscribed({
        userId: 'u1',
        enabled: true,
        emailKind: 'message',
      }),
    ).toBe(false);
    expect(obs.trace).not.toHaveBeenCalled();
  });

  it('shouldSkipUnsubscribed traces and returns true when disabled', () => {
    expect(
      helper.shouldSkipUnsubscribed({
        userId: 'u1',
        enabled: false,
        emailKind: 'photo rejection',
      }),
    ).toBe(true);
    expect(obs.trace).toHaveBeenCalledWith(
      'email photo rejection skipped unsubscribed userId=u1',
      ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
    );
  });
});
