import { OpenerTrackingService } from './opener-tracking.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { CONVERSATION_STARTER_PROMPT_VERSION } from './conversation-starter.types';

describe('OpenerTrackingService', () => {
  const prisma = {
    userProfile: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    conversationStarterCache: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
    },
  };

  const analytics = { track: jest.fn() };
  const obs = { trace: jest.fn(), error: jest.fn() };

  let service: OpenerTrackingService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OpenerTrackingService(
      prisma as never,
      analytics as never,
      obs as never,
    );
  });

  describe('markLifecycleBestEffort', () => {
    it('marks displayed once and tracks analytics without opener text', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ id: 'vp' });
      prisma.conversationStarterCache.findFirst.mockResolvedValue({
        id: 'row1',
        displayed: false,
        used: false,
        opener: 'Into hiking?',
      });
      prisma.conversationStarterCache.update.mockResolvedValue({});

      await service.markLifecycleBestEffort({
        sessionUserId: 'u1',
        candidateProfileId: 'cp',
        event: 'displayed',
      });

      expect(prisma.conversationStarterCache.update).toHaveBeenCalledWith({
        where: { id: 'row1' },
        data: { displayed: true, displayedAt: expect.any(Date) },
      });
      expect(analytics.track).toHaveBeenCalledWith(
        'u1',
        ProductAnalyticsEvents.OPENER_DISPLAYED,
        { openerLength: 'Into hiking?'.length },
      );
      const props = analytics.track.mock.calls[0][2] as Record<string, unknown>;
      expect(JSON.stringify(props)).not.toMatch(/hiking/i);
    });

    it('no-ops when already displayed', async () => {
      prisma.userProfile.findUnique.mockResolvedValue({ id: 'vp' });
      prisma.conversationStarterCache.findFirst.mockResolvedValue({
        id: 'row1',
        displayed: true,
        used: false,
        opener: 'x',
      });

      await service.markLifecycleBestEffort({
        sessionUserId: 'u1',
        candidateProfileId: 'cp',
        event: 'displayed',
      });

      expect(prisma.conversationStarterCache.update).not.toHaveBeenCalled();
    });

    it('swallows errors', async () => {
      prisma.userProfile.findUnique.mockRejectedValue(new Error('db down'));
      await expect(
        service.markLifecycleBestEffort({
          sessionUserId: 'u1',
          candidateProfileId: 'cp',
          event: 'used',
        }),
      ).resolves.toBeUndefined();
      expect(obs.error).toHaveBeenCalled();
    });
  });

  describe('trackOpenerSentBestEffort', () => {
    it('updates cache with sent + edited flags', async () => {
      prisma.userProfile.findMany.mockResolvedValue([
        { id: 'vp', userId: 'u1' },
        { id: 'cp', userId: 'u2' },
      ]);
      prisma.conversationStarterCache.findFirst.mockResolvedValue({
        id: 'row1',
        used: true,
        displayed: true,
        sent: false,
      });
      prisma.conversationStarterCache.update.mockResolvedValue({});

      await service.trackOpenerSentBestEffort({
        sessionUserId: 'u1',
        conversationId: 'mm1',
        messageId: 'msg1',
        sentText: 'Into hiking — edited!',
        originalOpener: 'Into hiking?',
        otherUserId: 'u2',
      });

      expect(prisma.conversationStarterCache.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opener: 'Into hiking?',
            promptVersion: CONVERSATION_STARTER_PROMPT_VERSION,
          }),
        }),
      );
      expect(prisma.conversationStarterCache.update).toHaveBeenCalledWith({
        where: { id: 'row1' },
        data: expect.objectContaining({
          sent: true,
          edited: true,
          sentMessageId: 'msg1',
          mutualMatchId: 'mm1',
          used: true,
        }),
      });
    });

    it('does not overwrite when already sent', async () => {
      prisma.userProfile.findMany.mockResolvedValue([
        { id: 'vp', userId: 'u1' },
        { id: 'cp', userId: 'u2' },
      ]);
      prisma.conversationStarterCache.findFirst.mockResolvedValue({
        id: 'row1',
        used: true,
        displayed: true,
        sent: true,
      });

      await service.trackOpenerSentBestEffort({
        sessionUserId: 'u1',
        conversationId: 'mm1',
        messageId: 'msg2',
        sentText: 'Into hiking?',
        originalOpener: 'Into hiking?',
        otherUserId: 'u2',
      });

      expect(prisma.conversationStarterCache.update).not.toHaveBeenCalled();
    });
  });

  describe('trackOpenerReplyBestEffort', () => {
    it('marks reply when last other message is opener-sent', async () => {
      prisma.message.findMany.mockResolvedValue([
        { id: 'opener_msg', senderId: 'u_other' },
      ]);
      prisma.conversationStarterCache.findFirst.mockResolvedValue({
        id: 'row1',
        sentAt: new Date('2026-08-05T12:00:00.000Z'),
      });
      prisma.conversationStarterCache.update.mockResolvedValue({});

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-08-05T12:45:00.000Z'));

      await service.trackOpenerReplyBestEffort({
        sessionUserId: 'u_me',
        conversationId: 'mm1',
        justCreatedMessageId: 'reply_msg',
      });

      expect(prisma.conversationStarterCache.findFirst).toHaveBeenCalledWith({
        where: {
          sentMessageId: { in: ['opener_msg'] },
          receivedReply: false,
        },
        select: { id: true, sentAt: true },
      });
      expect(prisma.conversationStarterCache.update).toHaveBeenCalledWith({
        where: { id: 'row1' },
        data: {
          receivedReply: true,
          replyReceivedAt: expect.any(Date),
          responseTimeMin: 45,
        },
      });

      jest.useRealTimers();
    });

    it('still attributes reply when opener sender sent a follow-up first', async () => {
      prisma.message.findMany.mockResolvedValue([
        { id: 'follow_up', senderId: 'u_other' },
        { id: 'opener_msg', senderId: 'u_other' },
      ]);
      prisma.conversationStarterCache.findFirst.mockResolvedValue({
        id: 'row1',
        sentAt: new Date('2026-08-05T12:00:00.000Z'),
      });
      prisma.conversationStarterCache.update.mockResolvedValue({});

      await service.trackOpenerReplyBestEffort({
        sessionUserId: 'u_me',
        conversationId: 'mm1',
        justCreatedMessageId: 'reply_msg',
      });

      expect(prisma.conversationStarterCache.findFirst).toHaveBeenCalledWith({
        where: {
          sentMessageId: { in: ['follow_up', 'opener_msg'] },
          receivedReply: false,
        },
        select: { id: true, sentAt: true },
      });
      expect(prisma.conversationStarterCache.update).toHaveBeenCalled();
    });
  });

  describe('getWeeklyReport', () => {
    it('aggregates rows', async () => {
      prisma.conversationStarterCache.findMany.mockResolvedValue([
        {
          displayed: true,
          used: true,
          sent: true,
          edited: false,
          receivedReply: true,
          responseTimeMin: 10,
        },
      ]);
      const report = await service.getWeeklyReport(
        new Date('2026-08-05T00:00:00.000Z'),
      );
      expect(report.generated).toBe(1);
      expect(report.responseRate).toBe(1);
      expect(report.avgResponseTimeMin).toBe(10);
    });
  });
});
