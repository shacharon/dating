import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../../logger/simple-logger.service';
import type {
  MatchIndexDto,
  MatchIndexItemDto,
  MatchRecordDto,
} from '../../matches/match.types';
import { MatchesService } from './matches.service';
import {
  resolveEngineFinalScore,
  type EngineFinalScoreSource,
} from '../../matches/match-score.util';

function recordToIndexItem(record: MatchRecordDto): MatchIndexItemDto {
  const score = resolveEngineFinalScore(record);
  return {
    matchId: record.matchId,
    a: record.a,
    b: record.b,
    finalScore: score,
    coverage: record.coverage,
    frictionRisk: record.frictionRisk,
    coveragePercent: record.coveragePercent,
    scoreCoverageFactor: record.scoreCoverageFactor,
    confidence: record.confidence,
    infoFlags: record.infoFlags,
    coverageFactor: record.coverageFactor,
    friction: record.friction,
    compatibility: record.compatibility,
    rawScore: record.rawScore,
    whyTop: (record.alignments ?? []).map((a) => ({
      key: a.key,
      text: `Score ${a.pairScore}`,
      direction: 'both',
    })),
    tensionsTop: (record.tensions ?? []).map((t) => ({
      key: t.key,
      text: t.text,
      gap: t.gap,
      direction: 'both',
    })),
    tensionMatrix: record.tensionMatrix,
    updatedAt: record.updatedAt,
    ...(record.explainability != null && {
      explainability: record.explainability,
    }),
  };
}

function finalScoreOf(record: EngineFinalScoreSource): number {
  return resolveEngineFinalScore(record);
}

function formatPenaltyOrBonus(
  items: Array<{ reason: string; amount: number }> | undefined,
): string {
  if (!items || items.length === 0) return 'none';
  return items.map((i) => `${i.reason}:${i.amount.toFixed(1)}`).join(' | ');
}

export interface RebuildStatsDto {
  generatedAt: string;
  profileCount: number;
  matchCount: number;
  pairErrors: number;
}

@Injectable()
export class MatchDaemonService {
  private readonly context = 'MatchDaemonService';
  private autoIndex: MatchIndexDto | null = null;

  constructor(
    private readonly logger: SimpleLogger,
    private readonly matchesService: MatchesService,
  ) {}

  /**
   * Refresh in-memory auto index from an existing full pairwise computation.
   * Use with `listAllComputed()` when the caller already has records (avoids double compute).
   */
  refreshIndexFromRecords(records: MatchRecordDto[]): RebuildStatsDto {
    const profileIds = new Set<string>();
    for (const r of records) {
      profileIds.add(r.aId);
      profileIds.add(r.bId);
    }
    const profileCount = profileIds.size;
    const pairErrors = 0;

    const matchCount = records.length;
    this.logger.log(
      `Daemon: ${matchCount} matches indexed, ${pairErrors} pair errors`,
      this.context,
    );

    const items = records
      .map(recordToIndexItem)
      .sort(
        (a, b) => finalScoreOf(b) - finalScoreOf(a),
      );

    const generatedAt = new Date().toISOString();
    const index: MatchIndexDto = {
      generatedAt,
      profileCount,
      matchCount,
      items,
    };

    this.autoIndex = index;
    this.logger.log('Daemon: in-memory index refreshed', this.context);
    this.logTopScoreAudit(records);

    return {
      generatedAt,
      profileCount,
      matchCount,
      pairErrors,
    };
  }

  /**
   * Runs the daemon once: load all profiles and compute every unique pair (i<j).
   * Returns stats. One bad profile pair does not break the run (try/catch per pair).
   */
  async runOnce(): Promise<RebuildStatsDto> {
    this.logger.log(
      'Daemon run starting: computing matches from DB profiles',
      this.context,
    );
    const records = await this.matchesService.listAllComputed();
    const snap = await this.matchesService.persistMatchPairHgSnapshots(records);
    this.logger.log(
      `[LEGACY] MatchPairHgSnapshot removed (Migration 3) — persist noop: ${snap.written} written, ${snap.skipped} skipped`,
      this.context,
    );
    return this.refreshIndexFromRecords(records);
  }

  /**
   * Temporary diagnostics: print top 10 highest-scoring matches with full score path observability.
   */
  private logTopScoreAudit(records: MatchRecordDto[]): void {
    const top = [...records]
      .sort((a, b) => finalScoreOf(b) - finalScoreOf(a))
      .slice(0, 10);

    if (top.length === 0) {
      this.logger.log('Top score audit: no records.', this.context);
      return;
    }

    this.logger.debug(
      'Top score audit (top 10 highest matches):',
      this.context,
    );
    for (const record of top) {
      const debug = record.debug;
      const line =
        `${record.a.name} vs ${record.b.name}` +
        ` | baseScore=${(debug?.baseScore ?? record.rawScore ?? finalScoreOf(record)).toFixed(2)}` +
        ` | scoreCoverageFactor=${(record.scoreCoverageFactor ?? debug?.scoreCoverageFactor ?? 1).toFixed(4)}` +
        ` | coverageFactor=${(record.coverageFactor ?? debug?.coverageFactor ?? 1).toFixed(4)}` +
        ` | confidence=${(record.confidence ?? debug?.confidence ?? 1).toFixed(4)}` +
        ` | penalties=${formatPenaltyOrBonus(debug?.penalties)}` +
        ` | finalScore=${finalScoreOf(record)}`;
      this.logger.debug(line, this.context);
    }
  }

  /**
   * Returns current index (sorted by overall desc). Null if not yet built.
   */
  async getAutoIndex(): Promise<MatchIndexDto | null> {
    const index = this.autoIndex;
    if (!index) return null;
    return {
      ...index,
      items: [...index.items].sort(
        (a, b) => finalScoreOf(b) - finalScoreOf(a),
      ),
    };
  }
}
