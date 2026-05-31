/**
 * Backend-only legacy phrase → canonical enrichment codes.
 * Keys: normalize with trim, lowercase, collapse internal whitespace to single spaces (no snake_case here).
 * Consulted in coerce only after exact canonical match and snake_case normalization both fail.
 */

export const LEGACY_ENRICHMENT_PHRASE_TO_DAILY_RHYTHM = {
  'social bursts and recharge': 'social_bursts_recharge',
  'slow mornings': 'slow_mornings',
  'stable nine-to-five': 'stable_nine_to_five',
  'startup grind schedule': 'startup_grind',
  'location-flexible rhythm': 'location_flexible',
  'homebody rhythm': 'homebody',
  'early bird': 'early_bird',
  'night owl': 'late',
  'fast-paced lifestyle': 'fast_paced',
} as const satisfies Readonly<Record<string, string>>;

export const LEGACY_ENRICHMENT_PHRASE_TO_AUTONOMY = {
  'closeness without losing individuality': 'closeness_individuality',
  'independent together': 'interdependence',
  'values alone time': 'values_alone_time',
  'independence with space': 'independence_with_space',
  'quality over quantity': 'quality_over_quantity',
} as const satisfies Readonly<Record<string, string>>;

export const LEGACY_ENRICHMENT_PHRASE_TO_KIDS_TIMELINE = {
  'wants kids soon': 'wants_kids_soon',
  'wants kids': 'wants_kids',
  'wants a family': 'wants_kids',
  'open on kids timeline': 'open_timeline',
  'already has kids': 'already_has_kids',
} as const satisfies Readonly<Record<string, string>>;

export const LEGACY_ENRICHMENT_PHRASE_TO_CONFLICT_STYLE = {
  'repair over blame': 'repair_over_blame',
  'prefers direct repair': 'repair_direct',
  'direct repair': 'repair_direct',
  'avoids drama': 'avoids_conflict',
  'cool down then talk': 'cooldown_then_talk',
  'process together': 'process_together',
  'withdraws and shuts down': 'withdraws_shuts_down',
  'escalates quickly': 'escalates_quickly',
  'talks issues through': 'process_together',
  'needs cooldown after conflict': 'cooldown_then_talk',
} as const satisfies Readonly<Record<string, string>>;

export const LEGACY_ENRICHMENT_PHRASE_TO_RELATIONSHIP_PACE = {
  'fast mover': 'fast_mover',
  'moving fast': 'fast_mover',
  'measured pace': 'measured_pace',
  'slow build': 'slow_build',
  'no rush': 'no_rush_explicit',
  'no rush explicit': 'no_rush_explicit',
} as const satisfies Readonly<Record<string, string>>;

export const LEGACY_ENRICHMENT_PHRASE_TO_COMMUNICATION_MODE = {
  'verbal expressive': 'verbal_expressive',
  'action oriented': 'action_oriented',
  'deep talker': 'deep_talker',
  'reserved opener': 'reserved_opener',
  'text heavy': 'text_heavy',
} as const satisfies Readonly<Record<string, string>>;
