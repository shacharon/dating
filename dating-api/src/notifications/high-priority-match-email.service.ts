import { Injectable } from '@nestjs/common';
import { MatchActionType } from '@prisma/client';
import { AnalyticsService } from '../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { buildNarrativeTldr } from '../matches/match-narrative/match-narrative-tldr';
import { PrismaService } from '../prisma/prisma.service';
import { EmailNotificationConfigService } from './email-notification-config.service';
import { EmailNotificationService } from './email-notification.service';
import {
  buildHighPriorityMatchEmailBodies,
  HIGH_PRIORITY_MATCH_EMAIL_SUBJECT,
  pickNewHighPriorityCandidate,
  type RankRowLike,
} from './high-priority-match-email.helpers';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

function ageYearsFromBirthDate(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

function displayLabel(
  nickname: string | null | undefined,
  name: string | null | undefined,
): string {
  const n = nickname?.trim();
  if (n) return n;
  const d = name?.trim();
  if (d) return d;
  return 'someone';
}

@Injectable()
export class HighPriorityMatchEmailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: EmailNotificationConfigService,
    private readonly email: EmailNotificationService,
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  /**
   * After a successful ready MatchListRank rebuild — best-effort; never throws to caller.
   */
  async notifyAfterRebuildBestEffort(args: {
    viewerUserId: string;
    priorRows: RankRowLike[];
    newRows: RankRowLike[];
  }): Promise<void> {
    try {
      await this.notifyAfterRebuild(args);
    } catch (err) {
      this.obs.error(
        `email high-priority match notify failed viewerUserId=${args.viewerUserId}`,
        ErrorCodes.EMAIL_HIGH_PRIORITY_MATCH_SEND_FAILED,
        err,
      );
    }
  }

  private async notifyAfterRebuild(args: {
    viewerUserId: string;
    priorRows: RankRowLike[];
    newRows: RankRowLike[];
  }): Promise<void> {
    const viewer = await this.prisma.user.findUnique({
      where: { id: args.viewerUserId },
      select: {
        id: true,
        email: true,
        emailNotificationsEnabled: true,
        highPriorityMatchEmailsEnabled: true,
        profile: { select: { id: true } },
      },
    });
    if (!viewer?.profile?.id) {
      this.trackSkip(args.viewerUserId, 'no_candidate');
      return;
    }
    if (!viewer.emailNotificationsEnabled) {
      this.trackSkip(args.viewerUserId, 'global_email_off');
      this.obs.trace(
        `email high-priority skipped global off userId=${viewer.id}`,
        ErrorCodes.EMAIL_SKIPPED_UNSUBSCRIBED,
      );
      return;
    }
    if (!viewer.highPriorityMatchEmailsEnabled) {
      this.trackSkip(args.viewerUserId, 'prefs_off');
      this.obs.trace(
        `email high-priority skipped prefs off userId=${viewer.id}`,
        ErrorCodes.EMAIL_HIGH_PRIORITY_MATCH_SKIPPED_PREFS,
      );
      return;
    }

    const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
    const recent = await this.prisma.highPriorityMatchEmailLog.findFirst({
      where: { viewerUserId: viewer.id, sentAt: { gte: since } },
      select: { id: true },
    });
    if (recent) {
      this.trackSkip(args.viewerUserId, 'frequency');
      this.obs.trace(
        `email high-priority skipped frequency userId=${viewer.id}`,
        ErrorCodes.EMAIL_HIGH_PRIORITY_MATCH_SKIPPED_FREQUENCY,
      );
      return;
    }

    const alreadyNotified = await this.prisma.highPriorityMatchEmailLog.findMany({
      where: { viewerUserId: viewer.id },
      select: { candidateProfileId: true },
    });
    const alreadyNotifiedIds = new Set(
      alreadyNotified.map((r) => r.candidateProfileId),
    );

    const excluded = await this.loadPassBlockCandidateProfileIds(viewer.id);
    const picked = pickNewHighPriorityCandidate({
      priorRows: args.priorRows,
      newRows: args.newRows,
      excludedCandidateProfileIds: excluded,
      alreadyNotifiedCandidateProfileIds: alreadyNotifiedIds,
    });
    if (!picked) {
      this.trackSkip(args.viewerUserId, 'no_candidate');
      return;
    }

    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: picked.candidateProfileId },
      select: {
        id: true,
        nickname: true,
        name: true,
        birthDate: true,
      },
    });
    if (!candidate) {
      this.trackSkip(args.viewerUserId, 'no_candidate');
      return;
    }

    const { reason, opener } = await this.loadReasonAndOpener(
      viewer.profile.id,
      candidate.id,
    );

    const matchUrl = `${this.config.appPublicUrl}/dating/me-matches/${candidate.id}`;
    const settingsUrl = `${this.config.appPublicUrl}/profile?tab=settings#notifications`;
    const bodies = buildHighPriorityMatchEmailBodies({
      matchLabel: displayLabel(candidate.nickname, candidate.name),
      ageYears: ageYearsFromBirthDate(candidate.birthDate),
      matchScore: picked.matchScore,
      reason,
      opener,
      matchUrl,
      settingsUrl,
    });

    const result = await this.email.sendTransactionalBestEffort({
      userId: viewer.id,
      to: viewer.email,
      subject: HIGH_PRIORITY_MATCH_EMAIL_SUBJECT,
      textBody: bodies.textBody,
      htmlBody: bodies.htmlBody,
      okCode: ErrorCodes.EMAIL_HIGH_PRIORITY_MATCH_SEND_OK,
      failCode: ErrorCodes.EMAIL_HIGH_PRIORITY_MATCH_SEND_FAILED,
      skippedProviderCode: ErrorCodes.EMAIL_SKIPPED_PROVIDER_DISABLED,
    });

    if (result !== 'sent') {
      // Provider disabled or failed — do not log (allow retry when email works).
      return;
    }

    await this.prisma.highPriorityMatchEmailLog.create({
      data: {
        viewerUserId: viewer.id,
        candidateProfileId: candidate.id,
        matchScore: picked.matchScore,
      },
    });

    this.analytics.track(
      viewer.id,
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SENT,
      {
        candidateProfileId: candidate.id,
        matchScore: Math.round(picked.matchScore),
      },
    );
  }

  private trackSkip(
    userId: string,
    reason:
      | 'prefs_off'
      | 'global_email_off'
      | 'frequency'
      | 'no_candidate',
  ): void {
    this.analytics.track(
      userId,
      ProductAnalyticsEvents.NOTIFICATION_HIGH_PRIORITY_MATCH_EMAIL_SKIPPED,
      { reason },
    );
  }

  private async loadPassBlockCandidateProfileIds(
    viewerUserId: string,
  ): Promise<Set<string>> {
    const actions = await this.prisma.matchAction.findMany({
      where: {
        actorUserId: viewerUserId,
        action: { in: [MatchActionType.PASS, MatchActionType.BLOCK] },
      },
      select: { targetProfileIdSnapshot: true },
    });
    return new Set(
      actions
        .map((a) => a.targetProfileIdSnapshot)
        .filter((id): id is string => Boolean(id?.trim())),
    );
  }

  private async loadReasonAndOpener(
    viewerProfileId: string,
    candidateProfileId: string,
  ): Promise<{ reason: string | null; opener: string | null }> {
    const [narrativeRow, openerRow] = await Promise.all([
      this.prisma.matchNarrativeCache.findFirst({
        where: { viewerProfileId, candidateProfileId },
        orderBy: { updatedAt: 'desc' },
        select: { narrativeTldr: true, narrative: true },
      }),
      this.prisma.conversationStarterCache.findFirst({
        where: { viewerProfileId, candidateProfileId },
        orderBy: { updatedAt: 'desc' },
        select: { opener: true },
      }),
    ]);

    let reason =
      narrativeRow?.narrativeTldr?.trim() ||
      (narrativeRow?.narrative
        ? buildNarrativeTldr(narrativeRow.narrative)
        : null) ||
      null;
    if (!reason) {
      reason = null;
    }
    const opener = openerRow?.opener?.trim() || null;
    return { reason, opener };
  }
}
