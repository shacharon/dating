/**
 * DECISION_LAYER_V1 — pair two enrichment signal snapshots into at most two
 * human sentences for match decisions. No scoring; no API calls.
 */

import type { EnrichmentSignalsLike } from './enrichment-display-v1';

export type MatchDecisionInsightsV1 = {
  /** Primary alignment (“Why this works”) */
  whyThisWorks: string | null;
  /** Main friction (“Watch out for”) */
  watchOutFor: string | null;
};

type Category = 'kids' | 'conflict' | 'rhythm' | 'autonomy';

type WeightedLine = { category: Category; text: string; weight: number };

const MAX_WORDS = 8;

function wordCount(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length;
}

/** Hard cap at MAX_WORDS for UI contract */
export function clipToMaxWords(s: string, max = MAX_WORDS): string {
  const parts = s.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, max).join(' ');
}

function assertLen(s: string): string {
  const out = clipToMaxWords(s);
  return wordCount(out) <= MAX_WORDS ? out : clipToMaxWords(out, MAX_WORDS);
}

function emptySignals(): EnrichmentSignalsLike {
  return {
    dailyRhythm: null,
    autonomyTogethernessDepth: null,
    kidsTimeline: null,
    conflictStyleDetail: null,
    interestsTop3: [],
  };
}

// --- Kids ---

const FAMILY_YES = new Set(['wants_kids_soon', 'wants_kids', 'open_timeline', 'already_has_kids']);

function kidsWhy(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  if (a === b) {
    const map: Record<string, string> = {
      childfree: 'Both childfree',
      wants_kids_soon: 'Both want kids soon',
      open_timeline: 'Both flexible on kids timing',
      wants_kids: 'Both want a family',
      already_has_kids: 'Both already have kids',
    };
    const text = map[a];
    return text ? { category: 'kids', text: assertLen(text), weight: 85 } : null;
  }
  if (a === 'childfree' && b === 'childfree') return null;
  if (FAMILY_YES.has(a) && FAMILY_YES.has(b) && !(a === 'childfree' || b === 'childfree')) {
    if (a === 'open_timeline' || b === 'open_timeline') {
      return { category: 'kids', text: assertLen('Both open to kids in some form'), weight: 72 };
    }
    return { category: 'kids', text: assertLen('Both leaning toward having kids'), weight: 78 };
  }
  return null;
}

function kidsWatch(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  const cf = (x: string) => x === 'childfree';
  const wants = (x: string) => x === 'wants_kids_soon' || x === 'wants_kids';
  if ((cf(a) && wants(b)) || (cf(b) && wants(a))) {
    return { category: 'kids', text: assertLen('Kids goals may not match'), weight: 95 };
  }
  if ((cf(a) && b === 'already_has_kids') || (cf(b) && a === 'already_has_kids')) {
    return { category: 'kids', text: assertLen('Kids context needs a real talk'), weight: 88 };
  }
  return null;
}

// --- Conflict ---

const HEAT = new Set(['escalates_quickly']);
const SHUT_DOWN = new Set(['withdraws_shuts_down']);
const INDIRECT = new Set(['indirect_communication', 'humor_deflect']);
const CALM_REPAIR = new Set([
  'cooldown_then_talk',
  'process_together',
  'repair_direct',
  'repair_over_blame',
  'avoids_conflict',
]);

function conflictBucket(code: string): 'heat' | 'shut' | 'indirect' | 'calm' | 'other' {
  if (HEAT.has(code)) return 'heat';
  if (SHUT_DOWN.has(code)) return 'shut';
  if (INDIRECT.has(code)) return 'indirect';
  if (CALM_REPAIR.has(code)) return 'calm';
  return 'other';
}

function conflictWhy(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  if (a === b) {
    return { category: 'conflict', text: assertLen('Similar approach when you disagree'), weight: 55 };
  }
  const ba = conflictBucket(a);
  const bb = conflictBucket(b);
  if (ba === bb && ba !== 'other') {
    return { category: 'conflict', text: assertLen('Similar style under stress'), weight: 52 };
  }
  return null;
}

function conflictWatch(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  if (a === b) return null;
  const ba = conflictBucket(a);
  const bb = conflictBucket(b);
  if (ba === 'heat' && (bb === 'shut' || bb === 'calm')) {
    return { category: 'conflict', text: assertLen('Different heat when you disagree'), weight: 82 };
  }
  if (ba === 'shut' && bb === 'heat') {
    return { category: 'conflict', text: assertLen('Different heat when you disagree'), weight: 82 };
  }
  if (ba === 'indirect' && bb === 'calm') {
    return { category: 'conflict', text: assertLen('Different directness when upset'), weight: 68 };
  }
  if (ba === 'calm' && bb === 'indirect') {
    return { category: 'conflict', text: assertLen('Different directness when upset'), weight: 68 };
  }
  if (ba !== bb && ba !== 'other' && bb !== 'other') {
    return { category: 'conflict', text: assertLen('Different conflict styles'), weight: 70 };
  }
  return null;
}

// --- Rhythm ---

function rhythmBucket(code: string | null): string | null {
  if (!code) return null;
  if (code === 'early_bird' || code === 'early_extreme') return 'early';
  if (code === 'late') return 'late';
  if (code === 'irregular' || code === 'startup_grind') return 'intense';
  if (code === 'stable_nine_to_five') return 'steady';
  if (code === 'slow_mornings' || code === 'homebody' || code === 'quiet_evenings') return 'quiet';
  if (code === 'fast_paced') return 'fast';
  if (code === 'location_flexible') return 'flex';
  if (code === 'social_bursts_recharge') return 'social';
  return 'other';
}

function rhythmWhy(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  if (a === b) {
    return { category: 'rhythm', text: assertLen('Similar day-to-day rhythm'), weight: 48 };
  }
  const ra = rhythmBucket(a);
  const rb = rhythmBucket(b);
  if (ra && rb && ra === rb) {
    return { category: 'rhythm', text: assertLen('Similar day-to-day rhythm'), weight: 46 };
  }
  return null;
}

function rhythmWatch(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  const ra = rhythmBucket(a);
  const rb = rhythmBucket(b);
  if (ra === 'early' && rb === 'late') {
    return { category: 'rhythm', text: assertLen('Opposite morning and night rhythm'), weight: 65 };
  }
  if (ra === 'late' && rb === 'early') {
    return { category: 'rhythm', text: assertLen('Opposite morning and night rhythm'), weight: 65 };
  }
  if (ra === 'steady' && rb === 'intense') {
    return { category: 'rhythm', text: assertLen('Different pace and schedule load'), weight: 58 };
  }
  if (ra === 'intense' && rb === 'steady') {
    return { category: 'rhythm', text: assertLen('Different pace and schedule load'), weight: 58 };
  }
  if (ra && rb && ra !== rb && ra !== 'other' && rb !== 'other') {
    return { category: 'rhythm', text: assertLen('Different daily rhythm'), weight: 50 };
  }
  return null;
}

// --- Autonomy ---

const SPACE_HEAVY = new Set(['independence_with_space', 'values_alone_time']);
const TOGETHER_OK = new Set([
  'interdependence',
  'closeness_individuality',
  'quality_over_quantity',
]);

function autonomyWhy(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  if (a === b) {
    return { category: 'autonomy', text: assertLen('Similar closeness and space needs'), weight: 42 };
  }
  if (TOGETHER_OK.has(a) && TOGETHER_OK.has(b)) {
    return { category: 'autonomy', text: assertLen('Both value connection with autonomy'), weight: 44 };
  }
  if (SPACE_HEAVY.has(a) && SPACE_HEAVY.has(b)) {
    return { category: 'autonomy', text: assertLen('Both need meaningful personal space'), weight: 43 };
  }
  return null;
}

function autonomyWatch(a: string | null, b: string | null): WeightedLine | null {
  if (!a || !b) return null;
  if (a === b) return null;
  if (
    (SPACE_HEAVY.has(a) && TOGETHER_OK.has(b)) ||
    (SPACE_HEAVY.has(b) && TOGETHER_OK.has(a))
  ) {
    return {
      category: 'autonomy',
      text: assertLen('Balance of closeness versus space differs'),
      weight: 60,
    };
  }
  if ((a === 'enmeshment' && !TOGETHER_OK.has(b)) || (b === 'enmeshment' && !TOGETHER_OK.has(a))) {
    return {
      category: 'autonomy',
      text: assertLen('Different appetite for always-together time'),
      weight: 62,
    };
  }
  return null;
}

function pickBest(lines: WeightedLine[], excludeCategory?: Category): WeightedLine | null {
  const sorted = [...lines].sort((x, y) => y.weight - x.weight);
  if (excludeCategory) {
    const hit = sorted.find((l) => l.category !== excludeCategory);
    return hit ?? sorted[0] ?? null;
  }
  return sorted[0] ?? null;
}

/**
 * Build at most two decision lines from a pair of enrichment snapshots.
 * Picks strongest positive (why) and strongest tension (watch) when possible,
 * avoiding the same category for both unless nothing else exists.
 */
export function buildMatchDecisionInsights(
  aRaw: EnrichmentSignalsLike | null | undefined,
  bRaw: EnrichmentSignalsLike | null | undefined,
): MatchDecisionInsightsV1 {
  const a = aRaw ?? emptySignals();
  const b = bRaw ?? emptySignals();

  const whyCandidates: WeightedLine[] = [];
  const watchCandidates: WeightedLine[] = [];

  const kw = kidsWhy(a.kidsTimeline, b.kidsTimeline);
  if (kw) whyCandidates.push(kw);
  const kt = kidsWatch(a.kidsTimeline, b.kidsTimeline);
  if (kt) watchCandidates.push(kt);

  const cw = conflictWhy(a.conflictStyleDetail, b.conflictStyleDetail);
  if (cw) whyCandidates.push(cw);
  const ct = conflictWatch(a.conflictStyleDetail, b.conflictStyleDetail);
  if (ct) watchCandidates.push(ct);

  const rw = rhythmWhy(a.dailyRhythm, b.dailyRhythm);
  if (rw) whyCandidates.push(rw);
  const rt = rhythmWatch(a.dailyRhythm, b.dailyRhythm);
  if (rt) watchCandidates.push(rt);

  const aw = autonomyWhy(a.autonomyTogethernessDepth, b.autonomyTogethernessDepth);
  if (aw) whyCandidates.push(aw);
  const at = autonomyWatch(a.autonomyTogethernessDepth, b.autonomyTogethernessDepth);
  if (at) watchCandidates.push(at);

  const strongKidsTension = watchCandidates.some((w) => w.category === 'kids' && w.weight >= 90);
  const filteredWhy = strongKidsTension
    ? whyCandidates.filter((w) => w.weight >= 65 || w.category === 'kids')
    : whyCandidates;

  const bestWhy = pickBest(filteredWhy);
  let bestWatch = pickBest(watchCandidates, bestWhy?.category);

  if (bestWatch && bestWhy && bestWatch.category === bestWhy.category) {
    bestWatch = pickBest(watchCandidates.filter((w) => w.category !== bestWhy.category));
  }

  if (!bestWhy && bestWatch) {
    const pool = strongKidsTension ? filteredWhy : whyCandidates;
    const fallbackWhy = pickBest(pool.filter((w) => w.category !== bestWatch!.category));
    return {
      whyThisWorks: fallbackWhy?.text ?? null,
      watchOutFor: bestWatch.text,
    };
  }

  if (bestWhy && !bestWatch) {
    const fallbackWatch = pickBest(watchCandidates.filter((w) => w.category !== bestWhy.category));
    return {
      whyThisWorks: bestWhy.text,
      watchOutFor: fallbackWatch?.text ?? null,
    };
  }

  return {
    whyThisWorks: bestWhy?.text ?? null,
    watchOutFor: bestWatch?.text ?? null,
  };
}
