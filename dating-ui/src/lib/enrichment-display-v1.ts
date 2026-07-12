/**
 * DISPLAY_LAYER_V1 — map enrichment API codes to short, human-readable chip labels.
 * No snake_case in user-visible strings; unknown codes fall back to light formatting.
 */

export type EnrichmentSignalsLike = {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  interestsTop3: string[];
};

/** dailyRhythm */
export const DAILY_RHYTHM_LABELS: Record<string, string> = {
  early_extreme: 'Very early starts',
  irregular: 'Irregular / shift-based rhythm',
  social_bursts_recharge: 'Social bursts, then recharge',
  slow_mornings: 'Slow mornings',
  late: 'Night owl / late nights',
  early_bird: 'Early bird / mornings',
  stable_nine_to_five: 'Steady 9–5 rhythm',
  fast_paced: 'Fast-paced lifestyle',
  homebody: 'Homebody / quiet nights in',
  startup_grind: 'Startup grind',
  location_flexible: 'Location-flexible / remote',
  quiet_evenings: 'Quiet evenings / low nightlife',
};

/** autonomyTogethernessDepth */
export const AUTONOMY_LABELS: Record<string, string> = {
  closeness_individuality: 'Close, but keep individuality',
  values_alone_time: 'Values alone time',
  enmeshment: 'Likes doing most things together',
  independence_with_space: 'Needs personal space',
  interdependence: 'Independent but connected',
  quality_over_quantity: 'Quality time over quantity',
};

/** kidsTimeline */
export const KIDS_LABELS: Record<string, string> = {
  childfree: 'Childfree',
  wants_kids_soon: 'Wants kids soon',
  open_timeline: 'Open on kids / timeline',
  wants_kids: 'Wants kids / family-oriented',
  already_has_kids: 'Already has kids',
};

/** conflictStyleDetail */
export const CONFLICT_LABELS: Record<string, string> = {
  escalates_quickly: 'Arguments escalate quickly',
  withdraws_shuts_down: 'Withdraws or shuts down',
  humor_deflect: 'Uses humor to deflect',
  indirect_communication: 'Indirect / hint-based style',
  cooldown_then_talk: 'Cools down, then talks',
  process_together: 'Talks things through calmly',
  repair_direct: 'Prefers direct repair',
  repair_over_blame: 'Repair over blame',
  avoids_conflict: 'Avoids drama / conflict',
};

/** interestsTop3 allowlist codes */
export const INTEREST_LABELS: Record<string, string> = {
  walking: 'Walking',
  hiking: 'Hiking',
  music: 'Music',
  reading: 'Reading',
  swimming: 'Swimming',
  lifting: 'Strength training',
  cycling: 'Cycling',
  cooking: 'Cooking',
  travel: 'Travel',
  photography: 'Photography',
  extreme_sports: 'Extreme sports',
  journaling: 'Journaling',
  yoga: 'Yoga',
  gaming: 'Gaming',
  meditation: 'Meditation',
  pilates: 'Pilates',
  gym: 'Gym',
  running: 'Running',
  fungi: 'Mushrooms / foraging',
  pottery: 'Pottery / ceramics',
  model_building: 'Model-making / building',
  boating: 'Boats / skiffs',
  fermentation: 'Fermentation',
  cartography: 'Maps / neighborhoods',
};

const SEP = ' · ';

function fallbackLabel(code: string): string {
  return code
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export function labelDailyRhythm(code: string | null | undefined): string | null {
  if (!code) return null;
  return DAILY_RHYTHM_LABELS[code] ?? fallbackLabel(code);
}

export function labelAutonomy(code: string | null | undefined): string | null {
  if (!code) return null;
  return AUTONOMY_LABELS[code] ?? fallbackLabel(code);
}

export function labelKids(code: string | null | undefined): string | null {
  if (!code) return null;
  return KIDS_LABELS[code] ?? fallbackLabel(code);
}

export function labelConflict(code: string | null | undefined): string | null {
  if (!code) return null;
  return CONFLICT_LABELS[code] ?? fallbackLabel(code);
}

export function labelInterest(code: string | null | undefined): string | null {
  if (!code) return null;
  const t = code.trim();
  if (!t) return null;
  return INTEREST_LABELS[t] ?? fallbackLabel(t);
}

export type EnrichmentDisplayChipV1 = {
  /** Stable key for React lists */
  field: 'dailyRhythm' | 'autonomyTogethernessDepth' | 'kidsTimeline' | 'conflictStyleDetail' | 'interestsTop3';
  /** User-visible text (no snake_case) */
  label: string;
};

const MAX_CHIPS = 5;

/**
 * Decision-useful enrichment strip: up to 5 chips, fixed priority.
 * Interests share one chip (up to 3 hobbies, middle-dot separated).
 */
export function buildEnrichmentDisplayChipsV1(signals: EnrichmentSignalsLike | undefined): EnrichmentDisplayChipV1[] {
  if (!signals) return [];
  const out: EnrichmentDisplayChipV1[] = [];

  const push = (field: EnrichmentDisplayChipV1['field'], label: string | null) => {
    if (!label || out.length >= MAX_CHIPS) return;
    out.push({ field, label });
  };

  push('dailyRhythm', labelDailyRhythm(signals.dailyRhythm));
  push('autonomyTogethernessDepth', labelAutonomy(signals.autonomyTogethernessDepth));
  push('kidsTimeline', labelKids(signals.kidsTimeline));
  push('conflictStyleDetail', labelConflict(signals.conflictStyleDetail));

  if (out.length < MAX_CHIPS) {
    const raw = Array.isArray(signals.interestsTop3) ? signals.interestsTop3 : [];
    const parts = raw
      .map((x) => (typeof x === 'string' ? labelInterest(x) : null))
      .filter((x): x is string => Boolean(x))
      .slice(0, 3);
    if (parts.length > 0) {
      out.push({ field: 'interestsTop3', label: parts.join(SEP) });
    }
  }

  return out.slice(0, MAX_CHIPS);
}

/**
 * UI examples (manual sanity check — not executed):
 *
 * handmade_202604_04 (Erez): Steady 9–5 rhythm · Quality time over quantity · Wants kids soon · Cools down, then talks · Strength training
 * handmade_202604_11 (Nitzan): Independent but connected · Maps / neighborhoods
 * handmade_202604_27 (Roni): Independent but connected · Open on kids / timeline · Mushrooms / foraging
 */
