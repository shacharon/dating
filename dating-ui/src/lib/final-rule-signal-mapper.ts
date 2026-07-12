import type { EnrichmentSignalsLike } from './enrichment-display-v1';

export const FINAL_KIDS_LABELS = [
  'childfree',
  'wants_kids_soon',
  'wants_kids',
  'open_timeline',
  'already_has_kids',
] as const;

export const FINAL_CONFLICT_LABELS = [
  'escalates_quickly',
  'withdraws_shuts_down',
  'cooldown_then_talk',
  'process_together',
  'repair_direct',
  'repair_over_blame',
  'avoids_conflict',
  'indirect_communication',
  'humor_deflect',
] as const;

export const FINAL_RHYTHM_LABELS = [
  'early_bird',
  'early_extreme',
  'late',
  'stable_nine_to_five',
  'irregular',
  'startup_grind',
  'slow_mornings',
  'homebody',
  'quiet_evenings',
  'fast_paced',
  'location_flexible',
  'social_bursts_recharge',
] as const;

export const FINAL_AUTONOMY_LABELS = [
  'independence_with_space',
  'values_alone_time',
  'interdependence',
  'closeness_individuality',
  'quality_over_quantity',
  'enmeshment',
] as const;

const KIDS_MAP: Readonly<Record<string, (typeof FINAL_KIDS_LABELS)[number]>> = {
  childfree: 'childfree',
  wants_kids_soon: 'wants_kids_soon',
  wants_kids: 'wants_kids',
  open_timeline: 'open_timeline',
  already_has_kids: 'already_has_kids',
};

const CONFLICT_MAP: Readonly<Record<string, (typeof FINAL_CONFLICT_LABELS)[number]>> = {
  escalates_quickly: 'escalates_quickly',
  withdraws_shuts_down: 'withdraws_shuts_down',
  cooldown_then_talk: 'cooldown_then_talk',
  process_together: 'process_together',
  repair_direct: 'repair_direct',
  repair_over_blame: 'repair_over_blame',
  avoids_conflict: 'avoids_conflict',
  indirect_communication: 'indirect_communication',
  humor_deflect: 'humor_deflect',
};

const RHYTHM_MAP: Readonly<Record<string, (typeof FINAL_RHYTHM_LABELS)[number]>> = {
  early_bird: 'early_bird',
  early_extreme: 'early_extreme',
  late: 'late',
  stable_nine_to_five: 'stable_nine_to_five',
  irregular: 'irregular',
  startup_grind: 'startup_grind',
  slow_mornings: 'slow_mornings',
  homebody: 'homebody',
  quiet_evenings: 'quiet_evenings',
  fast_paced: 'fast_paced',
  location_flexible: 'location_flexible',
  social_bursts_recharge: 'social_bursts_recharge',
};

const AUTONOMY_MAP: Readonly<Record<string, (typeof FINAL_AUTONOMY_LABELS)[number]>> = {
  independence_with_space: 'independence_with_space',
  values_alone_time: 'values_alone_time',
  interdependence: 'interdependence',
  closeness_individuality: 'closeness_individuality',
  quality_over_quantity: 'quality_over_quantity',
  enmeshment: 'enmeshment',
};

function mapFinalLabel<T extends string>(map: Readonly<Record<string, T>>, raw: string | null): T | null {
  if (!raw) return null;
  return map[raw] ?? null;
}

function mapInterests(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === 'string');
}

export function mapFinalRuleEnrichmentSignals(
  signals: EnrichmentSignalsLike | null | undefined,
): EnrichmentSignalsLike {
  return {
    kidsTimeline: mapFinalLabel(KIDS_MAP, signals?.kidsTimeline ?? null),
    conflictStyleDetail: mapFinalLabel(CONFLICT_MAP, signals?.conflictStyleDetail ?? null),
    dailyRhythm: mapFinalLabel(RHYTHM_MAP, signals?.dailyRhythm ?? null),
    autonomyTogethernessDepth: mapFinalLabel(AUTONOMY_MAP, signals?.autonomyTogethernessDepth ?? null),
    interestsTop3: mapInterests(signals?.interestsTop3),
  };
}
