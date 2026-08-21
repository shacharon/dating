import { NotFoundException } from '@nestjs/common';
import type { ContentViolationService } from '../../content-moderation/content-violation.service';
import type { IContentViolationRepository } from '../../content-moderation/repositories/content-violation.repository';
import { ErrorCodes } from '../../logging/error-codes';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { AdminContentViolationsService } from './admin-content-violations.service';

describe('AdminContentViolationsService', () => {
  const repository = {
    createViolationAndIncrementCount: jest.fn(),
    countViolations: jest.fn(),
    getUserViolationFields: jest.fn(),
    setProfileEditBlocked: jest.fn(),
    setMessagingMute: jest.fn(),
    resetViolationStatus: jest.fn(),
    clearExpiredMutes: jest.fn(),
    getViolationStatsRaw: jest.fn(),
    findViolationsForAdmin: jest.fn(),
    findBlockedUsersForAdmin: jest.fn(),
  } as unknown as IContentViolationRepository;
  const violations = {
    getViolationStats: jest.fn(),
  } as unknown as ContentViolationService;
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  let service: AdminContentViolationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminContentViolationsService(repository, violations, obs);
  });

  it('lists filtered violations and maps safe previews', async () => {
    const longText = 'x'.repeat(150);
    (repository.findViolationsForAdmin as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 'vio_1',
          userId: 'user_1',
          surface: 'message',
          category: 'sexual',
          flaggedText: longText,
          score: 0.9,
          action: 'blocked',
          createdAt: new Date('2026-08-01T10:00:00.000Z'),
          conversationId: 'mutual_1',
          recipientUserId: 'user_2',
          user: {
            email: 'a@example.com',
            contentViolationStatus: 'messaging_muted',
            contentViolationMutedUntil: new Date('2026-08-01T12:00:00.000Z'),
            profile: { nickname: 'Alice' },
          },
          recipient: {
            email: 'b@example.com',
            profile: { nickname: 'Bob' },
          },
        },
      ],
      total: 1,
    });
    const result = await service.listViolations({
      surface: ' message ',
      category: 'sexual',
      userId: 'user_1',
      userStatus: 'messaging_muted',
      hasRecipient: true,
      limit: 10,
      offset: 0,
    });
    expect(repository.findViolationsForAdmin).toHaveBeenCalledWith({
      surface: 'message',
      category: 'sexual',
      userId: 'user_1',
      action: undefined,
      userStatus: 'messaging_muted',
      hasRecipient: true,
      limit: 10,
      offset: 0,
    });
    expect(result.total).toBe(1);
    expect(result.violations[0]).toMatchObject({
      flaggedTextPreview: 'x'.repeat(100),
      userNickname: 'Alice',
      recipientEmail: 'b@example.com',
      recipientNickname: 'Bob',
    });
    expect(result.violations[0]).not.toHaveProperty('flaggedText');
  });

  it('includes full text only when requested', async () => {
    (repository.findViolationsForAdmin as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 'vio_1',
          userId: 'user_1',
          surface: 'message',
          category: 'hate',
          flaggedText: 'full phrase here',
          score: 0.9,
          action: 'blocked',
          createdAt: new Date(),
          conversationId: null,
          recipientUserId: null,
          user: {
            email: 'a@example.com',
            contentViolationStatus: 'ok',
            contentViolationMutedUntil: null,
            profile: null,
          },
          recipient: null,
        },
      ],
      total: 1,
    });
    const result = await service.listViolations({ includeFullText: true });
    expect(result.violations[0].flaggedText).toBe('full phrase here');
  });

  it('lists blocked users with their latest full violation', async () => {
    (repository.findBlockedUsersForAdmin as jest.Mock).mockResolvedValue({
      rows: [
        {
          id: 'user_1',
          email: 'a@example.com',
          contentViolationStatus: 'messaging_muted',
          contentViolationMutedUntil: null,
          contentViolationCount: 4,
          profile: { nickname: 'Alice' },
          contentViolations: [
            {
              id: 'vio_1',
              surface: 'message',
              category: 'harassment',
              flaggedText: 'I will hurt you badly',
              score: 0.99,
              action: 'blocked',
              createdAt: new Date(),
              conversationId: 'mutual_1',
              recipientUserId: 'user_2',
              recipient: {
                email: 'b@example.com',
                profile: { nickname: 'Bob' },
              },
            },
          ],
        },
      ],
      total: 1,
    });
    const result = await service.listBlockedUsers({ limit: 50, offset: 0 });
    expect(repository.findBlockedUsersForAdmin).toHaveBeenCalledWith({
      limit: 50,
      offset: 0,
    });
    expect(result.users[0]).toMatchObject({
      userStatus: 'messaging_muted',
      latestViolation: expect.objectContaining({
        flaggedText: 'I will hurt you badly',
        recipientEmail: 'b@example.com',
      }),
    });
  });

  it('delegates statistics to the policy service', async () => {
    const stats = {
      totalViolations: 3,
      violationsByCategory: { sexual: 3 },
      violationsBySurface: { message: 3 },
      blockedProfileUsers: 0,
      mutedMessageUsers: 1,
      mutedMessageUsersTemporary: 1,
      mutedMessageUsersIndefinite: 0,
    };
    (violations.getViolationStats as jest.Mock).mockResolvedValue(stats);
    await expect(service.getStats()).resolves.toEqual(stats);
  });

  it('unblocks an existing user and logs the previous status', async () => {
    (repository.getUserViolationFields as jest.Mock).mockResolvedValue({
      contentViolationStatus: 'messaging_muted',
      contentViolationMutedUntil: null,
      contentViolationCount: 4,
    });
    const result = await service.unblockUser(
      'admin_1',
      'user_1',
      'False positive',
    );
    expect(repository.resetViolationStatus).toHaveBeenCalledWith('user_1');
    expect(result.previousStatus).toBe('messaging_muted');
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('reason=False positive'),
      ErrorCodes.ADMIN_CONTENT_UNBLOCK,
    );
  });

  it('throws when the unblock target is missing', async () => {
    (repository.getUserViolationFields as jest.Mock).mockResolvedValue(null);
    await expect(
      service.unblockUser('admin_1', 'missing', 'note'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.resetViolationStatus).not.toHaveBeenCalled();
  });
});
