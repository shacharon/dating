/**
 * Analytics for match scores: distribution, metrics, top/worst pairs.
 * Logged as JSON for downstream consumption.
 */

import { Injectable } from '@nestjs/common';
import { SimpleLogger } from '../logger/simple-logger.service';
import { MatchesService } from './matches.service';
import type { MatchRecordDto } from './match.types';

export interface ScoreDistribution {
  '0-20': number;
  '20-40': number;
  '40-60': number;
  '60-80': number;
  '80-100': number;
}

export interface MatchAnalyticsMetrics {
  averageScore: number;
  medianScore: number;
  p90: number;
  p10: number;
}

export interface MatchPairSignals {
  compatibility: number | null;
  coveragePercent: number | null;
  coverageFactor: number | null;
  friction: number | null;
  frictionPenalty: number | null;
}

export interface MatchPairEntry {
  matchId: string;
  aId: string;
  bId: string;
  aName: string;
  bName: string;
  score: number;
  signals: MatchPairSignals;
}

export interface MatchAnalyticsLog {
  generatedAt: string;
  totalMatches: number;
  score_distribution: ScoreDistribution;
  metrics: MatchAnalyticsMetrics;
  topMatches: MatchPairEntry[];
  worstMatches: MatchPairEntry[];
}

function scoreFromRecord(r: MatchRecordDto): number {
  const s = r.finalScore ?? r.overall;
  return Number.isFinite(s) ? s : 0;
}

function toDistribution(scores: number[]): ScoreDistribution {
  const out: ScoreDistribution = {
    '0-20': 0,
    '20-40': 0,
    '40-60': 0,
    '60-80': 0,
    '80-100': 0,
  };
  for (const score of scores) {
    if (score >= 0 && score < 20) out['0-20']++;
    else if (score >= 20 && score < 40) out['20-40']++;
    else if (score >= 40 && score < 60) out['40-60']++;
    else if (score >= 60 && score < 80) out['60-80']++;
    else if (score >= 80 && score <= 100) out['80-100']++;
  }
  return out;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(
    Math.floor((p / 100) * sorted.length),
    sorted.length - 1,
  );
  return sorted[idx];
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function toPairEntry(r: MatchRecordDto): MatchPairEntry {
  const score = scoreFromRecord(r);
  return {
    matchId: r.matchId,
    aId: r.aId,
    bId: r.bId,
    aName: r.a?.name ?? r.aId,
    bName: r.b?.name ?? r.bId,
    score,
    signals: {
      compatibility: r.compatibility ?? null,
      coveragePercent: r.coveragePercent ?? null,
      coverageFactor: r.coverageFactor ?? null,
      friction: r.friction ?? null,
      frictionPenalty: r.frictionPenalty ?? null,
    },
  };
}

@Injectable()
export class MatchesAnalyticsService {
  constructor(
    private readonly matchesService: MatchesService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Load all matches, compute analytics, log as JSON, and return the payload.
   */
  async computeAndLog(): Promise<MatchAnalyticsLog> {
    const records = await this.matchesService.listAllComputed();
    const log = this.compute(records);

    this.logger.log(
      JSON.stringify({
        event: 'match_analytics',
        ...log,
      }),
      'MatchAnalytics',
    );

    return log;
  }

  /**
   * Compute analytics from a list of match records (no I/O, no logging).
   */
  compute(records: MatchRecordDto[]): MatchAnalyticsLog {
    const scores = records.map(scoreFromRecord);
    const sorted = [...scores].sort((a, b) => a - b);

    const totalMatches = records.length;
    const averageScore =
      totalMatches > 0
        ? Math.round((scores.reduce((s, x) => s + x, 0) / totalMatches) * 100) /
          100
        : 0;
    const medianScore =
      totalMatches > 0 ? Math.round(median(sorted) * 100) / 100 : 0;
    const p90 =
      totalMatches > 0 ? Math.round(percentile(sorted, 90) * 100) / 100 : 0;
    const p10 =
      totalMatches > 0 ? Math.round(percentile(sorted, 10) * 100) / 100 : 0;

    const score_distribution = toDistribution(scores);

    const withScore = records.map((r) => ({ r, score: scoreFromRecord(r) }));
    const byScoreDesc = [...withScore].sort((a, b) => b.score - a.score);
    const topMatches = byScoreDesc.slice(0, 10).map(({ r }) => toPairEntry(r));
    const worstMatches = byScoreDesc
      .slice(-10)
      .reverse()
      .map(({ r }) => toPairEntry(r));

    const log: MatchAnalyticsLog = {
      generatedAt: new Date().toISOString(),
      totalMatches,
      score_distribution,
      metrics: {
        averageScore,
        medianScore,
        p90,
        p10,
      },
      topMatches,
      worstMatches,
    };

    return log;
  }
}
