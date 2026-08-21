import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import { ContentViolationService } from './content-violation.service';
import type { IContentViolationRepository } from './repositories/content-violation.repository';

describe('ContentViolationService', () => {
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
  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;
  let service: ContentViolationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ContentViolationService(repository, obs);
  });

  it('records a violation with nullable context', async () => {
    await service.recordViolation({
      userId: 'user-1',
      surface: 'message',
      flaggedText: 'bad text',
      category: 'sexual',
      score: 0.9,
      action: 'blocked',
    });
    expect(repository.createViolationAndIncrementCount).toHaveBeenCalledWith({
      userId: 'user-1',
      surface: 'message',
      flaggedText: 'bad text',
      category: 'sexual',
      score: 0.9,
      action: 'blocked',
      conversationId: null,
      recipientUserId: null,
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('content violation recorded'),
      ErrorCodes.CONTENT_VIOLATION_RECORDED,
    );
  });

  it('records conversation context when provided', async () => {
    await service.recordViolation({
      userId: 'user-1',
      surface: 'message',
      flaggedText: 'bad text',
      category: 'harassment',
      score: 0.95,
      action: 'blocked',
      conversationId: 'mutual_1',
      recipientUserId: 'user-2',
    });
    expect(repository.createViolationAndIncrementCount).toHaveBeenCalledWith(
      expect.objectContaining({
        conversationId: 'mutual_1',
        recipientUserId: 'user-2',
      }),
    );
  });

  it('passes count filters and prefers exact surface policy', async () => {
    (repository.countViolations as jest.Mock).mockResolvedValue(2);
    const since = new Date('2026-08-01T00:00:00.000Z');
    await expect(
      service.getViolationCount('user-1', {
        surface: 'message',
        surfacePrefix: 'profile_',
        since,
      }),
    ).resolves.toBe(2);
    expect(repository.countViolations).toHaveBeenCalledWith({
      userId: 'user-1',
      surface: 'message',
      surfacePrefix: 'profile_',
      since,
    });
  });

  it('returns default status when user is missing', async () => {
    (repository.getUserViolationFields as jest.Mock).mockResolvedValue(null);
    await expect(service.getUserViolationStatus('missing')).resolves.toEqual({
      status: 'ok',
      mutedUntil: null,
      violationCount: 0,
    });
  });

  it('blocks profile after three profile violations', async () => {
    (repository.countViolations as jest.Mock).mockResolvedValue(3);
    await expect(
      service.enforceViolationThreshold('user-1', 'profile'),
    ).resolves.toEqual({
      shouldBlock: true,
      reason: '3_profile_violations',
    });
    expect(repository.setProfileEditBlocked).toHaveBeenCalledWith('user-1');
  });

  it('does not block profile under threshold', async () => {
    (repository.countViolations as jest.Mock).mockResolvedValue(2);
    await expect(
      service.enforceViolationThreshold('user-1', 'profile'),
    ).resolves.toEqual({ shouldBlock: false, reason: 'under_threshold' });
    expect(repository.setProfileEditBlocked).not.toHaveBeenCalled();
  });

  it.each([
    {
      counts: [3, 3, 3],
      reason: '3_hourly',
      label: '1 hour',
      indefinite: false,
    },
    {
      counts: [2, 10, 10],
      reason: '10_daily',
      label: '24 hours',
      indefinite: false,
    },
    {
      counts: [1, 5, 20],
      reason: '20_lifetime',
      label: 'indefinitely',
      indefinite: true,
    },
  ])(
    'applies $reason message mute',
    async ({ counts, reason, label, indefinite }) => {
      (repository.countViolations as jest.Mock)
        .mockResolvedValueOnce(counts[0])
        .mockResolvedValueOnce(counts[1])
        .mockResolvedValueOnce(counts[2]);
      const result = await service.enforceViolationThreshold(
        'user-1',
        'message',
      );
      expect(result).toMatchObject({
        shouldBlock: true,
        reason,
        muteLabel: label,
      });
      expect(repository.setMessagingMute).toHaveBeenCalledWith(
        'user-1',
        indefinite ? null : expect.any(Date),
      );
    },
  );

  it('returns under threshold for low message counts', async () => {
    (repository.countViolations as jest.Mock)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2);
    await expect(
      service.enforceViolationThreshold('user-1', 'message'),
    ).resolves.toEqual({ shouldBlock: false, reason: 'under_threshold' });
    expect(repository.setMessagingMute).not.toHaveBeenCalled();
  });

  it('clears an expired messaging mute lazily', async () => {
    (repository.getUserViolationFields as jest.Mock).mockResolvedValue({
      contentViolationStatus: 'messaging_muted',
      contentViolationMutedUntil: new Date(Date.now() - 60_000),
      contentViolationCount: 3,
    });
    await expect(service.isUserBlocked('user-1', 'message')).resolves.toBe(
      false,
    );
    expect(repository.resetViolationStatus).toHaveBeenCalledWith('user-1');
  });

  it('keeps active and indefinite message mutes blocked', async () => {
    (repository.getUserViolationFields as jest.Mock)
      .mockResolvedValueOnce({
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: new Date(Date.now() + 60_000),
        contentViolationCount: 3,
      })
      .mockResolvedValueOnce({
        contentViolationStatus: 'messaging_muted',
        contentViolationMutedUntil: null,
        contentViolationCount: 20,
      });
    await expect(service.isUserBlocked('user-1', 'message')).resolves.toBe(
      true,
    );
    await expect(service.isUserBlocked('user-1', 'message')).resolves.toBe(
      true,
    );
  });

  it('clears expired temporary mutes in a batch', async () => {
    (repository.clearExpiredMutes as jest.Mock).mockResolvedValue(2);
    await expect(service.clearExpiredMutes()).resolves.toBe(2);
    expect(repository.clearExpiredMutes).toHaveBeenCalledWith(expect.any(Date));
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('cleared 2 expired mutes'),
      ErrorCodes.CONTENT_MUTES_EXPIRED,
    );
  });

  it('maps raw violation statistics', async () => {
    (repository.getViolationStatsRaw as jest.Mock).mockResolvedValue({
      byCategory: [
        { category: 'sexual', count: 2 },
        { category: 'hate', count: 1 },
      ],
      bySurface: [
        { surface: 'message', count: 2 },
        { surface: 'profile_aboutMe', count: 1 },
      ],
      totalViolations: 3,
      blockedProfileUsers: 1,
      mutedUsers: [
        { contentViolationMutedUntil: new Date() },
        { contentViolationMutedUntil: null },
      ],
    });
    await expect(service.getViolationStats()).resolves.toEqual({
      totalViolations: 3,
      violationsByCategory: { sexual: 2, hate: 1 },
      violationsBySurface: { message: 2, profile_aboutMe: 1 },
      blockedProfileUsers: 1,
      mutedMessageUsers: 2,
      mutedMessageUsersTemporary: 1,
      mutedMessageUsersIndefinite: 1,
    });
  });
});
