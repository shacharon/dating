import { Inject, Injectable } from '@nestjs/common';
import {
  resolveMatchListRebuildCandidateCap,
} from '../match-list-candidate-cap';
import { toStoredMatchListScore } from '../match-list-rank-score';
import type { MeMatchesListResponseDto } from '../dto/me-matches-response.dto';
import type { MatchListRankSnapshot } from './match-list-rank.types';
import {
  MATCH_RANK_REPOSITORY,
  type IMatchRankRepository,
} from '../repositories/match.repository';
import { RankingAssembleService } from './match-ranking/ranking-assemble.service';
import { RankingLoadService } from './match-ranking/ranking-load.service';
import { RankingScorerService } from './match-ranking/ranking-scorer.service';
import { RankingTelemetryService } from './match-ranking/ranking-telemetry.service';
import {
  normalizeBuildFullRankedListOptions,
  type BuildFullRankedListOptions,
} from './match-ranking/ranking.types';

@Injectable()
export class MatchRankingService {
  constructor(
    private readonly loader: RankingLoadService,
    private readonly scorer: RankingScorerService,
    private readonly assembler: RankingAssembleService,
    private readonly telemetry: RankingTelemetryService,
    @Inject(MATCH_RANK_REPOSITORY)
    private readonly ranks: IMatchRankRepository,
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
      return { status: 'budget_exceeded', rows: [] };
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

  /** Full ranked match list (cache miss path) + materialized page hydrate. */
  async buildFullRankedList(
    userId: string,
    options?: BuildFullRankedListOptions,
  ): Promise<MeMatchesListResponseDto> {
    const opts = normalizeBuildFullRankedListOptions(options);
    const loaded = await this.loader.load(userId, opts);
    if (loaded.kind !== 'loaded') {
      return loaded.dto;
    }

    const scored = this.scorer.score(loaded.viewer, loaded.pool, opts);
    const assembled = await this.assembler.assemble(
      loaded.viewer,
      loaded.pool,
      scored,
      opts,
    );
    this.telemetry.track({
      userId,
      viewer: loaded.viewer,
      pool: loaded.pool,
      score: scored,
      emitListAnalytics: opts.emitListAnalytics,
      finalMatchCount: assembled.matches.length,
    });
    return assembled.dto;
  }
}
