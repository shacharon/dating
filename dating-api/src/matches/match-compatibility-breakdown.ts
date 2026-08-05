/**
 * Product-facing compatibility breakdown for algorithm transparency (Sprint 43 Story 1).
 * Deterministic display layer — no scoring changes.
 */

import type { BreakdownEntry, SignalKey } from '../compatibility/compatibility-score';
import {
  TIER1_KEYS,
  TIER2_KEYS,
} from '../compatibility/compatibility-score';
import {
  POSITIVE_CHIP_BY_SIGNAL,
  TENSION_CHIP_BY_ID,
} from './match-explainability';
import type { TensionMatrixEntryDto } from './match-engine.types';

export const BREAKDOWN_SIGNALS_MAX = 3;
export const BREAKDOWN_SHARED_TAGS_MAX = 8;
export const BREAKDOWN_CHALLENGES_MAX = 3;
/** Challenges only when friction is at least this (same spirit as tensionChip). */
export const BREAKDOWN_CHALLENGES_FRICTION_MIN = 3;

export type BreakdownMatchLevel = 'high' | 'medium' | 'low';
export type BreakdownBand = 'Low' | 'Medium' | 'High';

export type BreakdownSignalDto = {
  key: string;
  label: string;
  match: BreakdownMatchLevel;
  yourBand?: BreakdownBand;
  theirBand?: BreakdownBand;
};

export type BreakdownSectionDto = {
  score: number;
  signals: BreakdownSignalDto[];
};

export type InterestsSectionDto = {
  score: number;
  shared: string[];
  sharedCount: number;
};

export type ChallengesSectionDto = {
  areas: Array<{ id: string; label: string; note?: string }>;
};

export type CompatibilityBreakdownDto = {
  finalScore: number;
  values: BreakdownSectionDto;
  personality?: BreakdownSectionDto;
  interests: InterestsSectionDto;
  challenges?: ChallengesSectionDto;
};

export type CompatibilityBreakdownInput = {
  finalScore: number;
  valuesAlignment: number;
  interestAlignment: number;
  friction: number;
  breakdown: BreakdownEntry[];
  tensionMatrix: TensionMatrixEntryDto[];
  sharedInterests?: string[];
};

const TIER1_SET = new Set<string>(TIER1_KEYS);
const TIER2_SET = new Set<string>(TIER2_KEYS);

function clampScore100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** pairScore is 0–10. */
export function matchLevelFromPairScore(pairScore: number): BreakdownMatchLevel {
  if (pairScore >= 7) return 'high';
  if (pairScore >= 4) return 'medium';
  return 'low';
}

/** Signal self/partner values are 1–10 (engine may use 0–10). */
export function bandFromSignalValue(value: number): BreakdownBand {
  if (value <= 3) return 'Low';
  if (value <= 6) return 'Medium';
  return 'High';
}

function compareByPairScoreThenKey(a: BreakdownEntry, b: BreakdownEntry): number {
  if (b.pairScore !== a.pairScore) return b.pairScore - a.pairScore;
  return a.key.localeCompare(b.key);
}

function toSignalDto(entry: BreakdownEntry): BreakdownSignalDto {
  const key = entry.key;
  const label =
    POSITIVE_CHIP_BY_SIGNAL[key as SignalKey] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());
  return {
    key,
    label,
    match: matchLevelFromPairScore(entry.pairScore),
    yourBand: bandFromSignalValue(entry.self),
    theirBand: bandFromSignalValue(entry.partner),
  };
}

function topSignalsForTier(
  breakdown: BreakdownEntry[],
  tierSet: Set<string>,
  max: number,
): BreakdownSignalDto[] {
  return breakdown
    .filter((e) => tierSet.has(e.key))
    .sort(compareByPairScoreThenKey)
    .slice(0, max)
    .map(toSignalDto);
}

function personalityScoreFromTier(breakdown: BreakdownEntry[]): number | null {
  const tier2 = breakdown.filter((e) => TIER2_SET.has(e.key));
  if (tier2.length === 0) return null;
  const mean =
    tier2.reduce((sum, e) => sum + e.pairScore, 0) / tier2.length;
  return clampScore100(mean * 10);
}

function buildChallenges(
  friction: number,
  tensionMatrix: TensionMatrixEntryDto[],
): ChallengesSectionDto | undefined {
  if (friction < BREAKDOWN_CHALLENGES_FRICTION_MIN) return undefined;
  const sorted = [...tensionMatrix].sort((a, b) => {
    if (b.penalty !== a.penalty) return b.penalty - a.penalty;
    return a.id.localeCompare(b.id);
  });
  const areas = sorted.slice(0, BREAKDOWN_CHALLENGES_MAX).map((t) => {
    const label = TENSION_CHIP_BY_ID[t.id] ?? t.name;
    const note = t.explain?.trim() ? t.explain.trim() : undefined;
    return {
      id: t.id,
      label,
      ...(note && note !== label ? { note } : {}),
    };
  });
  if (areas.length === 0) return undefined;
  return { areas };
}

/**
 * Map compare internals → product breakdown. Section scores are component /
 * derived values — not blend weights and not an average of finalScore.
 */
export function buildCompatibilityBreakdown(
  input: CompatibilityBreakdownInput,
): CompatibilityBreakdownDto {
  const breakdown = input.breakdown ?? [];
  const sharedRaw = (input.sharedInterests ?? [])
    .map((t) => t.trim())
    .filter(Boolean);
  const sharedCount = sharedRaw.length;
  const shared = sharedRaw.slice(0, BREAKDOWN_SHARED_TAGS_MAX);

  const values: BreakdownSectionDto = {
    score: clampScore100(input.valuesAlignment),
    signals: topSignalsForTier(breakdown, TIER1_SET, BREAKDOWN_SIGNALS_MAX),
  };

  const personalityScore = personalityScoreFromTier(breakdown);
  const personality: BreakdownSectionDto | undefined =
    personalityScore == null
      ? undefined
      : {
          score: personalityScore,
          signals: topSignalsForTier(
            breakdown,
            TIER2_SET,
            BREAKDOWN_SIGNALS_MAX,
          ),
        };

  const interests: InterestsSectionDto = {
    score: clampScore100(input.interestAlignment),
    shared,
    sharedCount,
  };

  const challenges = buildChallenges(input.friction, input.tensionMatrix ?? []);

  return {
    finalScore: clampScore100(input.finalScore),
    values,
    ...(personality !== undefined ? { personality } : {}),
    interests,
    ...(challenges !== undefined ? { challenges } : {}),
  };
}
