import { Inject, Injectable } from '@nestjs/common';
import { StructuredObservabilityService } from '../../../../logging/structured-observability.service';
import { toStoredMatchListScore } from '../../rank/match-list-rank-score';
import type { MatchListRankSnapshot } from '../../rank/match-list-rank.types';
import type { MeMatchesListResponseDto } from '../../../dto/me-matches-response.dto';
import {
  MATCH_QUERY_REPOSITORY,
  MATCH_RANK_REPOSITORY,
  type IMatchQueryRepository,
  type IMatchRankRepository,
} from '../../../repositories/match.repository';
import type { RankPageRow } from '../../../repositories/match.repository.types';
import {
  resolveMatchListCandidateCap,
  resolveMatchListRebuildCandidateCap,
} from '../match-list-candidate-cap';
import { MatchListCandidateLoaderService } from './match-list-candidate-loader.service';
import { MatchListCandidateScorerService } from './match-list-candidate-scorer.service';
import { MatchListResponseAssemblerService } from './match-list-response-assembler.service';
import { MatchListRankTelemetryService } from './match-list-rank-telemetry.service';
import {
  hydrateMatchListPageFromRanks,
  type MatchListPageHydrateGate,
  type MatchListPageHydrateResult,
} from '../../match-list-page-hydrate';
import { toPresentationJson } from '../../match-list-rank-presentation.types';

@Injectable()
export class MatchRankingService {
  constructor(
    @Inject(MATCH_RANK_REPOSITORY)
    private readonly ranks: IMatchRankRepository,
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matchesQuery: IMatchQueryRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly loader: MatchListCandidateLoaderService,
    private readonly scorer: MatchListCandidateScorerService,
    private readonly assembler: MatchListResponseAssemblerService,
    private readonly telemetry: MatchListRankTelemetryService,
  ) {}

  async buildMatchListRankSnapshot(
    viewerUserId: string,
    options?: {
      deadlineAtMs?: number;
      now?: () => number;
    },
  ): Promise<MatchListRankSnapshot> {
    const dto = await this.buildFullRankedList(viewerUserId, {
      candidateCap: resolveMatchListRebuildCandidateCap(),
      emitListAnalytics: false,
      deadlineAtMs: options?.deadlineAtMs,
      now: options?.now,
    });
    if (dto.budgetExceeded) {
      return {
        status: 'budget_exceeded',
        rows: [],
      };
    }
    if (dto.status !== 'ready') {
      return {
        status: 'not_ready',
        reason: dto.reason,
        rows: [],
      };
    }
    return {
      status: 'ready',
      rows: (dto.matches ?? []).map((m) => ({
        candidateProfileId: m.id,
        matchScore: toStoredMatchListScore(m.matchScore),
        hardBlocked: Boolean(m.hardBlocked),
        presentationJson: toPresentationJson({
          explainability: m.explainability,
          recommendation: m.recommendation,
          hardBlocked: m.hardBlocked,
        }),
      })),
    };
  }

  async persistMatchListRankSnapshot(
    viewerUserId: string,
    snapshot: MatchListRankSnapshot,
  ): Promise<{ rowsWritten: number; rowsDeleted: number }> {
    if (snapshot.status === 'budget_exceeded') {
      return { rowsWritten: 0, rowsDeleted: 0 };
    }
    if (snapshot.status === 'not_ready' || snapshot.rows.length === 0) {
      const rowsDeleted =
        await this.ranks.deleteAllRanksForViewer(viewerUserId);
      return { rowsWritten: 0, rowsDeleted };
    }
    return this.ranks.replaceRankSnapshot(
      viewerUserId,
      snapshot.rows,
      new Date(),
    );
  }

  /** Sprint 68 — page hydrate from stored presentationJson (cache hit path). */
  async hydrateMatchListPageFromRanks(
    userId: string,
    pageRanks: RankPageRow[],
    gate: MatchListPageHydrateGate,
  ): Promise<MatchListPageHydrateResult> {
    return hydrateMatchListPageFromRanks(
      { matches: this.matchesQuery, obs: this.obs },
      userId,
      pageRanks,
      gate,
    );
  }

  /** Full ranked match list (cache miss path) + materialized page hydrate. */
  async buildFullRankedList(
    userId: string,
    options?: {
      candidateCap?: number;
      emitListAnalytics?: boolean;
      candidateProfileIds?: string[];
      deadlineAtMs?: number;
      now?: () => number;
    },
  ): Promise<MeMatchesListResponseDto> {
    const loaded = await this.loader.loadContext(userId, {
      candidateCap: options?.candidateCap ?? resolveMatchListCandidateCap(),
      emitListAnalytics: options?.emitListAnalytics !== false,
      candidateProfileIds: options?.candidateProfileIds,
    });
    if (loaded.kind === 'not_ready' || loaded.kind === 'ready_early') {
      return loaded.dto;
    }

    const scoring = this.scorer.scoreCandidates(loaded.context, {
      deadlineAtMs: options?.deadlineAtMs,
      now: options?.now,
    });
    const dto = await this.assembler.assembleResponse(loaded.context, scoring);
    this.telemetry.recordListBuild(loaded.context, scoring, dto);
    return dto;
  }
}
