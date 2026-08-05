import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CONVERSATION_STARTER_PROMPT_VERSION } from './conversation-starter.types';
import { wasOpenerEdited } from './opener-tracking-normalize';
import {
  buildOpenerWeeklyReport,
  type OpenerWeeklyReport,
} from './opener-tracking-report';

export type OpenerLifecycleEvent = 'displayed' | 'used';

@Injectable()
export class OpenerTrackingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  /**
   * Best-effort lifecycle mark. Always resolves (never throws to callers).
   */
  async markLifecycleBestEffort(args: {
    sessionUserId: string;
    candidateProfileId: string;
    event: OpenerLifecycleEvent;
  }): Promise<void> {
    try {
      const viewerProfileId = await this.resolveProfileId(args.sessionUserId);
      if (!viewerProfileId) return;

      const row = await this.findLatestCacheRow(
        viewerProfileId,
        args.candidateProfileId,
      );
      if (!row) return;

      const now = new Date();
      if (args.event === 'displayed') {
        if (row.displayed) return;
        await this.prisma.conversationStarterCache.update({
          where: { id: row.id },
          data: { displayed: true, displayedAt: now },
        });
        this.analytics.track(
          args.sessionUserId,
          ProductAnalyticsEvents.OPENER_DISPLAYED,
          { openerLength: row.openerLength },
        );
        return;
      }

      if (row.used) return;
      await this.prisma.conversationStarterCache.update({
        where: { id: row.id },
        data: {
          used: true,
          usedAt: now,
          ...(!row.displayed
            ? { displayed: true, displayedAt: now }
            : {}),
        },
      });
      this.analytics.track(
        args.sessionUserId,
        ProductAnalyticsEvents.OPENER_USED,
        { openerLength: row.openerLength },
      );
    } catch (err) {
      this.obs.trace(
        `opener lifecycle mark failed event=${args.event} candidateProfileId=${args.candidateProfileId}`,
        ErrorCodes.OPENER_TRACKING_BEST_EFFORT_FAILED,
      );
      this.obs.error(
        `opener lifecycle mark failed event=${args.event}`,
        ErrorCodes.OPENER_TRACKING_BEST_EFFORT_FAILED,
        err,
      );
    }
  }

  /**
   * After message create — attribute send to opener cache when client sends originalOpener.
   */
  async trackOpenerSentBestEffort(args: {
    sessionUserId: string;
    conversationId: string;
    messageId: string;
    sentText: string;
    originalOpener: string;
    otherUserId: string;
  }): Promise<void> {
    try {
      const profiles = await this.resolveProfilePair(
        args.sessionUserId,
        args.otherUserId,
      );
      if (!profiles) return;

      const original = args.originalOpener.trim();
      if (!original) return;

      const edited = wasOpenerEdited(args.sentText, original);
      const now = new Date();

      let row = await this.prisma.conversationStarterCache.findFirst({
        where: {
          viewerProfileId: profiles.viewerProfileId,
          candidateProfileId: profiles.candidateProfileId,
          promptVersion: CONVERSATION_STARTER_PROMPT_VERSION,
          opener: original,
        },
        orderBy: { createdAt: 'desc' },
        select: { id: true, used: true, displayed: true, sent: true },
      });

      if (!row) {
        const latest = await this.findLatestCacheRow(
          profiles.viewerProfileId,
          profiles.candidateProfileId,
        );
        if (latest) {
          row = {
            id: latest.id,
            used: latest.used,
            displayed: latest.displayed,
            sent: latest.sent,
          };
        }
      }
      if (!row) return;
      // Idempotent: first attributed send wins (avoid clobbering sentMessageId).
      if (row.sent) return;

      await this.prisma.conversationStarterCache.update({
        where: { id: row.id },
        data: {
          used: true,
          usedAt: row.used ? undefined : now,
          displayed: true,
          displayedAt: row.displayed ? undefined : now,
          sent: true,
          sentAt: now,
          edited,
          sentMessageId: args.messageId,
          mutualMatchId: args.conversationId,
        },
      });
    } catch (err) {
      this.obs.error(
        `opener sent tracking failed conversationId=${args.conversationId} messageId=${args.messageId}`,
        ErrorCodes.OPENER_TRACKING_BEST_EFFORT_FAILED,
        err,
      );
    }
  }

  /**
   * After message create — if this is a reply to an opener-attributed message, mark reply.
   */
  async trackOpenerReplyBestEffort(args: {
    sessionUserId: string;
    conversationId: string;
    justCreatedMessageId: string;
  }): Promise<void> {
    try {
      const recent = await this.prisma.message.findMany({
        where: {
          conversationId: args.conversationId,
          id: { not: args.justCreatedMessageId },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 20,
        select: { id: true, senderId: true },
      });

      // Any prior message from the other party may be the opener send — including
      // when they sent a follow-up before this reply (Architect edge case).
      const otherMessageIds = recent
        .filter((m) => m.senderId !== args.sessionUserId)
        .map((m) => m.id);
      if (otherMessageIds.length === 0) return;

      const starter = await this.prisma.conversationStarterCache.findFirst({
        where: {
          sentMessageId: { in: otherMessageIds },
          receivedReply: false,
        },
        select: { id: true, sentAt: true },
      });
      if (!starter) return;

      const now = new Date();
      const responseTimeMin =
        starter.sentAt != null
          ? Math.floor((now.getTime() - starter.sentAt.getTime()) / 60_000)
          : null;

      await this.prisma.conversationStarterCache.update({
        where: { id: starter.id },
        data: {
          receivedReply: true,
          replyReceivedAt: now,
          responseTimeMin,
        },
      });
    } catch (err) {
      this.obs.error(
        `opener reply tracking failed conversationId=${args.conversationId}`,
        ErrorCodes.OPENER_TRACKING_BEST_EFFORT_FAILED,
        err,
      );
    }
  }

  async getWeeklyReport(asOf: Date = new Date()): Promise<OpenerWeeklyReport> {
    const since = new Date(asOf.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.conversationStarterCache.findMany({
      where: { createdAt: { gte: since, lte: asOf } },
      select: {
        displayed: true,
        used: true,
        sent: true,
        edited: true,
        receivedReply: true,
        responseTimeMin: true,
      },
    });
    return buildOpenerWeeklyReport(rows);
  }

  private async resolveProfileId(userId: string): Promise<string | null> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  private async resolveProfilePair(
    viewerUserId: string,
    candidateUserId: string,
  ): Promise<{ viewerProfileId: string; candidateProfileId: string } | null> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: [viewerUserId, candidateUserId] } },
      select: { id: true, userId: true },
    });
    const viewer = profiles.find((p) => p.userId === viewerUserId);
    const candidate = profiles.find((p) => p.userId === candidateUserId);
    if (!viewer || !candidate) return null;
    return {
      viewerProfileId: viewer.id,
      candidateProfileId: candidate.id,
    };
  }

  private async findLatestCacheRow(
    viewerProfileId: string,
    candidateProfileId: string,
  ): Promise<{
    id: string;
    displayed: boolean;
    used: boolean;
    sent: boolean;
    openerLength: number;
  } | null> {
    const row = await this.prisma.conversationStarterCache.findFirst({
      where: {
        viewerProfileId,
        candidateProfileId,
        promptVersion: CONVERSATION_STARTER_PROMPT_VERSION,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        displayed: true,
        used: true,
        sent: true,
        opener: true,
      },
    });
    if (!row) return null;
    return {
      id: row.id,
      displayed: row.displayed,
      used: row.used,
      sent: row.sent,
      openerLength: row.opener.length,
    };
  }
}
