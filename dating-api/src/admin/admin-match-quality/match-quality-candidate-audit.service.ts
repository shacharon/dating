import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MatchFeedbackSentiment } from '@prisma/client';
import { ErrorCodes } from '../../logging/error-codes';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  buildMatchQualityAuditJson,
  type MatchQualityAuditReport,
} from '../../me-profile/matches/actions/match-quality-audit';
import { MeMatchesService } from '../../me-profile/matches/core/me-matches.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CandidateAuditResponseDto } from './dto/candidate-audit-response.dto';
import type { CandidateFeedbackSummaryDto } from './dto/candidate-audit-response.dto';
import { computeWindowStart } from './match-quality-window';

const AUDIT_UNAVAILABLE = {
  code: 'match_not_visible_to_viewer',
  message:
    'Match detail not available for resolved viewer(s). Try another viewerUserId query param or CLI audit.',
} as const;

@Injectable()
export class MatchQualityCandidateAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly obs: StructuredObservabilityService,
    private readonly meMatches: MeMatchesService,
  ) {}

  async getCandidateAudit(
    adminUserId: string,
    candidateProfileId: string,
    windowDays: number,
    viewerUserId?: string,
  ): Promise<CandidateAuditResponseDto> {
    const candidate = await this.prisma.userProfile.findUnique({
      where: { id: candidateProfileId },
      select: { id: true },
    });
    if (!candidate) {
      throw new NotFoundException({ error: 'candidate_not_found' });
    }

    const feedbackSummary = await this.buildCandidateFeedbackSummary(
      candidateProfileId,
      windowDays,
    );

    const viewerIds = await this.resolveViewerCandidates(
      candidateProfileId,
      viewerUserId,
    );
    if (viewerIds.length === 0) {
      throw new UnprocessableEntityException({ error: 'viewer_required' });
    }

    let audit: MatchQualityAuditReport | null = null;
    let usedViewerId = viewerIds[viewerIds.length - 1]!;

    for (const vid of viewerIds) {
      usedViewerId = vid;
      try {
        audit = await buildMatchQualityAuditJson({
          viewerUserId: vid,
          candidateProfileId,
          meMatches: this.meMatches,
          prisma: this.prisma,
          includeListContext: true,
        });
        this.obs.trace(
          `event=admin_match_quality_audit_fetched adminUserId=${adminUserId} candidateProfileId=${candidateProfileId} viewerUserId=${vid} outcome=${audit.compare.outcome}`,
          ErrorCodes.ADMIN_MATCH_QUALITY_AUDIT_FETCHED,
        );
        break;
      } catch (e) {
        if (e instanceof NotFoundException) {
          continue;
        }
        throw e;
      }
    }

    const response: CandidateAuditResponseDto = {
      candidateProfileId,
      viewerUserId: usedViewerId,
      windowDays,
      feedbackSummary,
      audit,
    };

    if (!audit) {
      response.auditUnavailable = { ...AUDIT_UNAVAILABLE };
    }

    return response;
  }

  private async buildCandidateFeedbackSummary(
    candidateProfileId: string,
    windowDays: number,
  ): Promise<CandidateFeedbackSummaryDto> {
    const windowStart = computeWindowStart(windowDays);
    const where = {
      matchProfileId: candidateProfileId,
      createdAt: { gte: windowStart },
    };

    const [grouped, latest] = await Promise.all([
      this.prisma.matchFeedback.groupBy({
        by: ['sentiment'],
        where,
        _count: { _all: true },
      }),
      this.prisma.matchFeedback.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
        select: { sentiment: true },
      }),
    ]);

    const positiveCount =
      grouped.find((row) => row.sentiment === MatchFeedbackSentiment.POSITIVE)
        ?._count._all ?? 0;
    const negativeCount =
      grouped.find((row) => row.sentiment === MatchFeedbackSentiment.NEGATIVE)
        ?._count._all ?? 0;

    return {
      negativeCount,
      positiveCount,
      lastSentiment: latest?.sentiment ?? null,
    };
  }

  private async resolveViewerCandidates(
    profileId: string,
    explicitViewerUserId?: string,
  ): Promise<string[]> {
    const trimmed = explicitViewerUserId?.trim();
    if (trimmed) {
      return [trimmed];
    }

    const rows = await this.prisma.matchFeedback.findMany({
      where: {
        matchProfileId: profileId,
        sentiment: MatchFeedbackSentiment.NEGATIVE,
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['userId'],
      select: { userId: true },
      take: 3,
    });

    return rows.map((row) => row.userId);
  }
}
