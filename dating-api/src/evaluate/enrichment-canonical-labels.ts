/**
 * Closed canonical labels for enrichment core scalars (persistence + API contract).
 * Any other string is rejected; known legacy phrase-style values are repaired via
 * `enrichment-legacy-phrase-map.ts` (consulted only when value is not already canonical).
 */

import {
  LEGACY_ENRICHMENT_PHRASE_TO_AUTONOMY,
  LEGACY_ENRICHMENT_PHRASE_TO_CONFLICT_STYLE,
  LEGACY_ENRICHMENT_PHRASE_TO_DAILY_RHYTHM,
  LEGACY_ENRICHMENT_PHRASE_TO_KIDS_TIMELINE,
} from './enrichment-legacy-phrase-map';

export const ENRICHMENT_DAILY_RHYTHM_LABELS = [
  'early_extreme',
  'irregular',
  'social_bursts_recharge',
  'slow_mornings',
  'late',
  'early_bird',
  'stable_nine_to_five',
  'fast_paced',
  'homebody',
  'startup_grind',
  'location_flexible',
  'quiet_evenings',
] as const;

export const ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS = [
  'closeness_individuality',
  'values_alone_time',
  'enmeshment',
  'independence_with_space',
  'interdependence',
  'quality_over_quantity',
] as const;

export const ENRICHMENT_KIDS_TIMELINE_LABELS = [
  'childfree',
  'wants_kids_soon',
  'open_timeline',
  'wants_kids',
  'already_has_kids',
] as const;

export const ENRICHMENT_CONFLICT_STYLE_DETAIL_LABELS = [
  'escalates_quickly',
  'withdraws_shuts_down',
  'humor_deflect',
  'indirect_communication',
  'cooldown_then_talk',
  'process_together',
  'repair_direct',
  'repair_over_blame',
  'avoids_conflict',
] as const;

export type EnrichmentDailyRhythmLabel =
  (typeof ENRICHMENT_DAILY_RHYTHM_LABELS)[number];
export type EnrichmentAutonomyTogethernessLabel =
  (typeof ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS)[number];
export type EnrichmentKidsTimelineLabel =
  (typeof ENRICHMENT_KIDS_TIMELINE_LABELS)[number];
export type EnrichmentConflictStyleDetailLabel =
  (typeof ENRICHMENT_CONFLICT_STYLE_DETAIL_LABELS)[number];

const DAILY_SET = new Set<string>(ENRICHMENT_DAILY_RHYTHM_LABELS);
const AUTONOMY_SET = new Set<string>(ENRICHMENT_AUTONOMY_TOGETHERNESS_LABELS);
const KIDS_SET = new Set<string>(ENRICHMENT_KIDS_TIMELINE_LABELS);
const CONFLICT_SET = new Set<string>(ENRICHMENT_CONFLICT_STYLE_DETAIL_LABELS);

function normalizePhraseKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Map spaces/hyphens to underscores for canonical snake_case labels. */
function normalizeSnakeish(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

function coerceToClosedSet(
  raw: string | null | undefined,
  allowed: ReadonlySet<string>,
  legacyPhraseToLabel: Readonly<Record<string, string>>,
): string | null {
  if (raw == null) return null;
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  if (!t) return null;
  if (allowed.has(t)) return t;
  const snake = normalizeSnakeish(t);
  if (allowed.has(snake)) return snake;
  const phrase = normalizePhraseKey(t);
  const mapped = legacyPhraseToLabel[phrase];
  if (mapped && allowed.has(mapped)) return mapped;
  return null;
}

export function coerceEnrichmentDailyRhythm(
  raw: string | null | undefined,
): EnrichmentDailyRhythmLabel | null {
  const v = coerceToClosedSet(
    raw,
    DAILY_SET,
    LEGACY_ENRICHMENT_PHRASE_TO_DAILY_RHYTHM,
  );
  return v as EnrichmentDailyRhythmLabel | null;
}

export function coerceEnrichmentAutonomyTogetherness(
  raw: string | null | undefined,
): EnrichmentAutonomyTogethernessLabel | null {
  const v = coerceToClosedSet(
    raw,
    AUTONOMY_SET,
    LEGACY_ENRICHMENT_PHRASE_TO_AUTONOMY,
  );
  return v as EnrichmentAutonomyTogethernessLabel | null;
}

export function coerceEnrichmentKidsTimeline(
  raw: string | null | undefined,
): EnrichmentKidsTimelineLabel | null {
  const v = coerceToClosedSet(
    raw,
    KIDS_SET,
    LEGACY_ENRICHMENT_PHRASE_TO_KIDS_TIMELINE,
  );
  return v as EnrichmentKidsTimelineLabel | null;
}

export function coerceEnrichmentConflictStyleDetail(
  raw: string | null | undefined,
): EnrichmentConflictStyleDetailLabel | null {
  const v = coerceToClosedSet(
    raw,
    CONFLICT_SET,
    LEGACY_ENRICHMENT_PHRASE_TO_CONFLICT_STYLE,
  );
  return v as EnrichmentConflictStyleDetailLabel | null;
}

export interface EnrichmentCoreScalarsInput {
  dailyRhythm: string | null | undefined;
  autonomyTogethernessDepth: string | null | undefined;
  kidsTimeline: string | null | undefined;
  conflictStyleDetail: string | null | undefined;
}

export interface EnrichmentCoreScalars {
  dailyRhythm: EnrichmentDailyRhythmLabel | null;
  autonomyTogethernessDepth: EnrichmentAutonomyTogethernessLabel | null;
  kidsTimeline: EnrichmentKidsTimelineLabel | null;
  conflictStyleDetail: EnrichmentConflictStyleDetailLabel | null;
}

export function sanitizeEnrichmentCoreScalars(
  input: EnrichmentCoreScalarsInput,
): EnrichmentCoreScalars {
  return {
    dailyRhythm: coerceEnrichmentDailyRhythm(input.dailyRhythm),
    autonomyTogethernessDepth: coerceEnrichmentAutonomyTogetherness(
      input.autonomyTogethernessDepth,
    ),
    kidsTimeline: coerceEnrichmentKidsTimeline(input.kidsTimeline),
    conflictStyleDetail: coerceEnrichmentConflictStyleDetail(
      input.conflictStyleDetail,
    ),
  };
}
