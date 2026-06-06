/**
 * Scan matches and flag those that meet specific rule conditions.
 * Logs each flagged match: matchId, reason, signals.
 */

import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MatchesService } from './matches.service';
import type { MatchRecordDto } from './match.types';
import { resolveEngineFinalScore } from './match-score.util';
import type { MatchPairSignals } from './matches-analytics.service';

export interface FlaggedMatchEntry {
  matchId: string;
  reason: string;
  signals: MatchPairSignals;
}

const REASONS = {
  HIGH_SCORE_HIGH_FRICTION: 'score>80 AND friction>5',
  HIGH_SCORE_LOW_COVERAGE: 'score>80 AND coverage<0.5',
  /** similarity = compatibility 0-100; >7 on 1-10 scale => compatibility > 70 */
  LOW_SCORE_HIGH_SIMILARITY: 'score<30 AND similarity>7',
} as const;

function scoreFromRecord(r: MatchRecordDto): number {
  const s = resolveEngineFinalScore(r);
  return Number.isFinite(s) ? s : 0;
}

function toSignals(r: MatchRecordDto): MatchPairSignals {
  return {
    compatibility: r.compatibility ?? null,
    coveragePercent: r.coveragePercent ?? null,
    coverageFactor: r.coverageFactor ?? null,
    friction: r.friction ?? null,
    frictionPenalty: r.frictionPenalty ?? null,
  };
}

function getReasons(r: MatchRecordDto): string[] {
  const score = scoreFromRecord(r);
  const friction = r.friction ?? 0;
  const coverage = r.coverageFactor ?? 0;
  /** Compatibility is 0-100; "similarity > 7" (1-10 scale) => compatibility > 70 */
  const similarity = (r.compatibility ?? 0) / 10;

  const reasons: string[] = [];
  if (score > 80 && friction > 5) {
    reasons.push(REASONS.HIGH_SCORE_HIGH_FRICTION);
  }
  if (score > 80 && coverage < 0.5) {
    reasons.push(REASONS.HIGH_SCORE_LOW_COVERAGE);
  }
  if (score < 30 && similarity > 7) {
    reasons.push(REASONS.LOW_SCORE_HIGH_SIMILARITY);
  }
  return reasons;
}

@Injectable()
export class MatchesScanService {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Scan all matches, flag those matching the rules, and log each with matchId, reason, signals.
   * Returns the list of flagged entries.
   */
  async scanAndLog(): Promise<FlaggedMatchEntry[]> {
    const records = await this.matchesService.listAllComputed();
    const flagged: FlaggedMatchEntry[] = [];

    for (const r of records) {
      const reasons = getReasons(r);
      if (reasons.length === 0) continue;

      const entry: FlaggedMatchEntry = {
        matchId: r.matchId,
        reason: reasons.join('; '),
        signals: toSignals(r),
      };
      flagged.push(entry);

      this.logger.log(
        JSON.stringify({
          event: 'match_scan_flagged',
          matchId: entry.matchId,
          reason: entry.reason,
          signals: entry.signals,
        }),
        'MatchScan',
      );
    }

    return flagged;
  }
}
