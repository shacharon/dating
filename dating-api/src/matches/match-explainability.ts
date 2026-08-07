/**
 * Deterministic match explainability: chips + one short reason.
 * No LLM, no randomness, no scoring changes — display layer only.
 */

import type { BreakdownEntry } from '../compatibility/compatibility-score';
import type { SignalKey } from '../compatibility/compatibility-score';
import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import {
  isExpansion01ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_01,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_01,
} from './expansion-01-explainability';
import {
  isExpansion02ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_02,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_02,
} from './expansion-02-explainability';
import {
  isExpansion03ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_03,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_03,
} from './expansion-03-explainability';
import {
  isExpansion04ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_04,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_04,
} from './expansion-04-explainability';
import {
  isExpansion05ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_05,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_05,
} from './expansion-05-explainability';
import {
  isExpansion06ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_06,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_06,
} from './expansion-06-explainability';
import {
  isExpansion07ShadowChipKey,
  pickInterestOverlapTags,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_07,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_07,
} from './expansion-07-explainability';
import {
  isExpansion10ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_10,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_10,
} from './expansion-10-explainability';
import {
  isExpansion11ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_11,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_11,
} from './expansion-11-explainability';
import {
  isExpansion12ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_12,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_12,
} from './expansion-12-explainability';
import {
  isExpansion13ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_13,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_13,
} from './expansion-13-explainability';
import {
  isExpansion14ShadowChipKey,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as SHADOW_POSITIVE_CHIP_BY_SIGNAL_14,
  SHADOW_SIGNAL_DOMAIN as SHADOW_SIGNAL_DOMAIN_14,
} from './expansion-14-explainability';

export interface MatchExplainabilityDto {
  positiveChips: string[];
  /** Present only when friction >= 3 and a tension driver exists. */
  tensionChip?: string;
  reasonShort: string;
  /** Present when both profiles share at least one interest tag. */
  sharedInterestNote?: string;
  /** Up to 2 shared interest tags for distinct overlap chips (canonical preferred). */
  interestOverlapTags?: string[];
}

export interface MatchExplainabilityInput {
  compatibility: number;
  /** Overall match score; drives reason tone (not compatibility). */
  finalScore: number;
  friction: number;
  breakdown: BreakdownEntry[];
  tensionMatrix: Array<{ id: string; penalty: number }>;
  /** Shared interest tags from both profiles (used for the sharedInterestNote). */
  sharedInterests?: string[];
}

/** Fixed product labels per compatibility signal key (deterministic). */
export const POSITIVE_CHIP_BY_SIGNAL: Record<SignalKey, string> = {
  ambition: 'Ambition alignment',
  socialBattery: 'Social rhythm',
  healthBodyConsciousness: 'Wellness focus',
  emotionalDepth: 'Emotional depth',
  attachmentSecurity: 'Secure attachment',
  directness: 'Direct communication',
  independence: 'Independence fit',
  traditionalism: 'Shared values',
  financialMindset: 'Money mindset',
  relationshipClarity: 'Relationship expectations',
  spirituality: 'Shared values',
  lifestylePace: 'Lifestyle pace',
  physicalPriority: 'Physical chemistry',
  statusOrientation: 'Lifestyle & status',
  conflictStyle: 'Conflict approach',
};

/**
 * Coarse families for chip diversity (display-only). Multiple signals may share a label
 * (e.g. Shared values); diversity applies at label + source-key domain.
 */
export const SIGNAL_DOMAIN: Record<SignalKey, string> = {
  emotionalDepth: 'emotional',
  attachmentSecurity: 'emotional',
  directness: 'communication',
  conflictStyle: 'communication',
  socialBattery: 'social',
  ambition: 'ambition_money',
  financialMindset: 'ambition_money',
  healthBodyConsciousness: 'lifestyle',
  lifestylePace: 'lifestyle',
  physicalPriority: 'lifestyle',
  statusOrientation: 'lifestyle',
  traditionalism: 'values',
  spirituality: 'values',
  relationshipClarity: 'relationship',
  independence: 'relationship',
};

/** Diversity penalty per extra chip already chosen from the same domain (soft bias). */
const DOMAIN_REPEAT_PENALTY = 32;

/** Short tension chip from top friction matrix rule (by penalty, then id). */
export const TENSION_CHIP_BY_ID: Record<string, string> = {
  stability_vs_nomadism: 'Stability vs mobility',
  emotional_depth_gap: 'Emotional depth gap',
  both_low_attachment: 'Attachment vulnerability',
  fusion_vs_boundaries: 'Closeness vs space',
  independence_mismatch: 'Different independence needs',
  attachment_anxiety_vs_directness: 'Sensitivity vs bluntness',
  traditional_vs_high_pace: 'Tradition vs fast pace',
  traditionalism_structure_gap: 'Different structure preferences',
  relationship_clarity_flow_gap: 'Different relationship expectations',
  social_battery_mismatch: 'Different social energy',
  lifestyle_pace_mismatch: 'Different pace of life',
  financial_mindset_mismatch: 'Different money mindset',
  status_orientation_mismatch: 'Different status focus',
  physical_priority_mismatch: 'Different physical priority',
  empathy_gap: 'Empathy mismatch',
  vulnerability_mismatch: 'Openness vs walls',
  emotional_volatility_gap: 'Emotional steadiness gap',
  affection_needs_gap: 'Different affection needs',
  humor_mismatch: 'Playfulness mismatch',
  intellectual_gap: 'Different mental stimulation needs',
  creative_mismatch: 'Creative drive mismatch',
  activity_level_gap: 'Different activity levels',
  domestic_out_mismatch: 'Home vs out mismatch',
  novelty_routine_clash: 'Novelty vs routine',
  casual_intimacy_clash: 'Casual vs committed intimacy',
  support_exchange_mismatch: 'Arrangement vs romance',
  support_both_provider: 'Both want to provide',
  support_both_recipient: 'Both seek support',
  religious_observance_gap: 'Religious practice gap',
  education_level_gap: 'Education expectations',
  honesty_integrity_gap: 'Honesty values gap',
  chronotype_clash: 'Morning vs night',
  repair_skills_gap: 'Different repair styles',
  both_low_repair: 'Conflict recovery risk',
  forgiveness_style_gap: 'Different forgiveness pace',
  stress_response_clash: 'Pursue vs withdraw under stress',
  jealousy_security_gap: 'Trust & space mismatch',
  both_high_jealousy: 'Shared jealousy risk',
  listening_presence_gap: 'Different listening styles',
  emotional_expression_gap: 'Different expression styles',
  growth_mindset_gap: 'Different growth pace',
  both_low_self_awareness: 'Self-insight gap',
  patience_tolerance_gap: 'Different tolerance levels',
  intimacy_pacing_clash: 'Different pace to closeness',
  monogamy_alignment_mismatch: 'Relationship structure mismatch',
};

function isSignalKey(k: string): k is SignalKey {
  return (COMPATIBILITY_SIGNAL_KEYS as readonly string[]).includes(k);
}

function isExplainabilityChipKey(key: string): boolean {
  return (
    isSignalKey(key) ||
    isExpansion01ShadowChipKey(key) ||
    isExpansion02ShadowChipKey(key) ||
    isExpansion03ShadowChipKey(key) ||
    isExpansion04ShadowChipKey(key) ||
    isExpansion05ShadowChipKey(key) ||
    isExpansion06ShadowChipKey(key) ||
    isExpansion07ShadowChipKey(key) ||
    isExpansion10ShadowChipKey(key) ||
    isExpansion11ShadowChipKey(key) ||
    isExpansion12ShadowChipKey(key) ||
    isExpansion13ShadowChipKey(key) ||
    isExpansion14ShadowChipKey(key)
  );
}

function chipLabelForKey(key: string): string | undefined {
  if (isSignalKey(key)) return POSITIVE_CHIP_BY_SIGNAL[key];
  if (isExpansion01ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_01[key];
  }
  if (isExpansion02ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_02[key];
  }
  if (isExpansion03ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_03[key];
  }
  if (isExpansion04ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_04[key];
  }
  if (isExpansion05ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_05[key];
  }
  if (isExpansion06ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_06[key];
  }
  if (isExpansion07ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_07[key];
  }
  if (isExpansion10ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_10[key];
  }
  if (isExpansion11ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_11[key];
  }
  if (isExpansion12ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_12[key];
  }
  if (isExpansion13ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_13[key];
  }
  if (isExpansion14ShadowChipKey(key)) {
    return SHADOW_POSITIVE_CHIP_BY_SIGNAL_14[key];
  }
  return undefined;
}

function domainForKey(key: string): string {
  if (isSignalKey(key)) return SIGNAL_DOMAIN[key];
  if (isExpansion01ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_01[key];
  if (isExpansion02ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_02[key];
  if (isExpansion03ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_03[key];
  if (isExpansion04ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_04[key];
  if (isExpansion05ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_05[key];
  if (isExpansion06ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_06[key];
  if (isExpansion07ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_07[key];
  if (isExpansion10ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_10[key];
  if (isExpansion11ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_11[key];
  if (isExpansion12ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_12[key];
  if (isExpansion13ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_13[key];
  if (isExpansion14ShadowChipKey(key)) return SHADOW_SIGNAL_DOMAIN_14[key];
  return 'unknown';
}

function compareBreakdownEntry(a: BreakdownEntry, b: BreakdownEntry): number {
  if (b.pairScore !== a.pairScore) return b.pairScore - a.pairScore;
  return a.key.localeCompare(b.key);
}

type TierPredicate = (e: BreakdownEntry) => boolean;

const POSITIVE_TIERS: TierPredicate[] = [
  (e) => e.self >= 7 && e.partner >= 7,
  (e) => e.pairScore >= 7,
  (e) => e.pairScore >= 6,
  (e) => e.pairScore >= 5,
];

/** Best (lowest) tier index for which this entry qualifies, or -1 if none. */
function tierIndexForEntry(e: BreakdownEntry): number {
  if (!isExplainabilityChipKey(e.key)) return -1;
  for (let i = 0; i < POSITIVE_TIERS.length; i++) {
    if (POSITIVE_TIERS[i](e)) return i;
  }
  return -1;
}

/** Higher = better candidate before diversity adjustment. */
function baseCompositeScore(tierIdx: number, pairScore: number): number {
  return (POSITIVE_TIERS.length - tierIdx) * 100 + pairScore;
}

interface ScoredLabelCandidate {
  key: string;
  label: string;
  domain: string;
  composite: number;
}

function buildLabelCandidates(
  breakdown: BreakdownEntry[],
): ScoredLabelCandidate[] {
  const bestByLabel = new Map<string, ScoredLabelCandidate>();

  for (const e of breakdown) {
    const ti = tierIndexForEntry(e);
    if (ti < 0) continue;
    const key = e.key;
    const label = chipLabelForKey(key);
    if (!label) continue;
    const domain = domainForKey(key);
    const composite = baseCompositeScore(ti, e.pairScore);
    const prev = bestByLabel.get(label);
    if (
      !prev ||
      composite > prev.composite ||
      (composite === prev.composite && key.localeCompare(prev.key) < 0)
    ) {
      bestByLabel.set(label, { key, label, domain, composite });
    }
  }

  const list = [...bestByLabel.values()];
  list.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    return a.key.localeCompare(b.key);
  });
  return list;
}

/**
 * Up to 3 positive chips: tier strength first, then soft diversity across `SIGNAL_DOMAIN`
 * so one family (e.g. ambition + money + social) does not crowd out mixed domains when
 * scores are close.
 */
/** Max positive chips shown in match explainability (chip picker). */
export const MAX_POSITIVE_CHIPS = 5;

export function pickPositiveChips(breakdown: BreakdownEntry[]): string[] {
  const candidates = buildLabelCandidates(breakdown);
  if (candidates.length === 0) return [];

  const selected: ScoredLabelCandidate[] = [];
  const domainCounts = new Map<string, number>();

  while (selected.length < MAX_POSITIVE_CHIPS && candidates.length > 0) {
    let bestI = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const already = domainCounts.get(c.domain) ?? 0;
      const adj = c.composite - DOMAIN_REPEAT_PENALTY * Math.max(0, already);
      if (
        adj > bestAdj ||
        (adj === bestAdj && c.key.localeCompare(candidates[bestI].key) < 0)
      ) {
        bestAdj = adj;
        bestI = i;
      }
    }
    const pick = candidates.splice(bestI, 1)[0];
    selected.push(pick);
    domainCounts.set(pick.domain, (domainCounts.get(pick.domain) ?? 0) + 1);
  }

  return selected.map((s) => s.label);
}

function topTensionChip(
  friction: number,
  tensionMatrix: Array<{ id: string; penalty: number }>,
): string | undefined {
  if (friction < 3 || tensionMatrix.length === 0) return undefined;
  const sorted = [...tensionMatrix].sort((a, b) => {
    if (b.penalty !== a.penalty) return b.penalty - a.penalty;
    return a.id.localeCompare(b.id);
  });
  const top = sorted[0];
  if (!top) return undefined;
  return TENSION_CHIP_BY_ID[top.id] ?? top.id.replace(/_/g, ' ');
}

function joinChips(chips: string[]): string {
  if (chips.length === 0) return '';
  if (chips.length === 1) return chips[0];
  if (chips.length === 2) return `${chips[0]} and ${chips[1]}`;
  const head = chips.slice(0, -1).join(', ');
  return `${head}, and ${chips[chips.length - 1]}`;
}

/** Stable fingerprint for template rotation (no randomness). */
function reasonVariantKey(
  finalScore: number,
  positiveChips: string[],
  breakdown: BreakdownEntry[],
): number {
  let h = finalScore * 131 + positiveChips.length * 17;
  if (positiveChips[0]) {
    for (let i = 0; i < positiveChips[0].length; i++) {
      h = (h * 31 + positiveChips[0].charCodeAt(i)) >>> 0;
    }
  }
  h = (h + breakdown.length * 13) >>> 0;
  return h;
}

function pickSecondaryLabelWithMinPairScore(
  breakdown: BreakdownEntry[],
  excludeLabels: Set<string>,
  minPairScore: number,
): string | undefined {
  const candidates = breakdown
    .filter((e) => isSignalKey(e.key) && e.pairScore >= minPairScore)
    .map((e) => ({
      label: POSITIVE_CHIP_BY_SIGNAL[e.key],
      pairScore: e.pairScore,
      key: e.key,
    }))
    .filter((c) => !excludeLabels.has(c.label))
    .sort((a, b) => {
      if (b.pairScore !== a.pairScore) return b.pairScore - a.pairScore;
      return a.key.localeCompare(b.key);
    });
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    return c.label;
  }
  return undefined;
}

/** Secondary prose when one chip: pairScore ≥ 5 (display-only). */
function pickWeakSecondaryLabel(
  breakdown: BreakdownEntry[],
  excludeLabels: Set<string>,
): string | undefined {
  return pickSecondaryLabelWithMinPairScore(breakdown, excludeLabels, 5);
}

/** Mid-band single-chip line: try ≥5 then ≥4 so a named hint almost always exists. */
function pickMidSecondaryHint(
  breakdown: BreakdownEntry[],
  excludeLabels: Set<string>,
): string | undefined {
  return (
    pickSecondaryLabelWithMinPairScore(breakdown, excludeLabels, 5) ??
    pickSecondaryLabelWithMinPairScore(breakdown, excludeLabels, 4)
  );
}

function withChipsBody(
  finalScore: number,
  chipsJoined: string,
  variant: number,
  chipCount: number,
): string {
  const p = chipCount >= 2;
  const i = variant % 3;
  if (finalScore >= 80) {
    if (i === 0) {
      return `Clearest fit shows up around ${chipsJoined}; overall this reads as a strong, clear match.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} are where you line up most convincingly—a strong match overall.`
        : `${chipsJoined} is where you line up most convincingly—a strong match overall.`;
    }
    return `You both trend together on ${chipsJoined}, which supports a clear overall fit.`;
  }
  if (finalScore >= 60) {
    if (i === 0) {
      return `Clearest fit shows up around ${chipsJoined}; overall this reads as a solid, good fit.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} are where your profiles align most; the overall read is solid.`
        : `${chipsJoined} is where your profiles align most; the overall read is solid.`;
    }
    return `You both trend together on ${chipsJoined}—a solid match, not a fluke.`;
  }
  if (finalScore >= 50) {
    if (i === 0) {
      return p
        ? `The match is mixed overall, but ${chipsJoined} show moderate areas of overlap.`
        : `The match is mixed overall, but ${chipsJoined} shows a moderate area of overlap.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} stand out for moderate alignment; the rest of the profile mix is uneven.`
        : `${chipsJoined} stands out as a moderate alignment; the rest of the profile mix is uneven.`;
    }
    return `You share real overlap on ${chipsJoined}, even though the overall picture stays moderate.`;
  }
  if (finalScore >= 40) {
    if (i === 0) {
      return p
        ? `There's only partial overlap so far—${chipsJoined} are the main places where some alignment shows up.`
        : `There's only partial overlap so far—${chipsJoined} is the main place some alignment shows up.`;
    }
    if (i === 1) {
      return p
        ? `${chipsJoined} capture a partial fit; elsewhere the signals look thin or conflicting.`
        : `${chipsJoined} captures a partial fit; elsewhere the signals look thin or conflicting.`;
    }
    return `A few signals converge on ${chipsJoined}, but overall this still reads as a partial match.`;
  }
  if (i === 0) {
    return p
      ? `Overall alignment looks limited; ${chipsJoined} are among the few clearer touchpoints.`
      : `Overall alignment looks limited; ${chipsJoined} is one of the few clearer touchpoints.`;
  }
  if (i === 1) {
    return p
      ? `${chipsJoined} hint at narrow pockets of overlap in an otherwise weak match.`
      : `${chipsJoined} hints at a narrow pocket of overlap in an otherwise weak match.`;
  }
  return p
    ? `The fit is weak overall—${chipsJoined} are about the clearest threads to point to.`
    : `The fit is weak overall—${chipsJoined} is about the clearest thread to point to.`;
}

function fallbackHintsBody(
  finalScore: number,
  hintsJoined: string,
  variant: number,
  hintCount: number,
): string {
  const hp = hintCount >= 2;
  const i = variant % 2;
  if (finalScore >= 80) {
    if (i === 0) {
      return `Several dimensions land in a good-not-great band—especially ${hintsJoined}—while the headline match still reads strong overall.`;
    }
    return `There is meaningful alignment around ${hintsJoined}; taken together with the rest of the signals, the overall fit reads strong.`;
  }
  if (finalScore >= 60) {
    if (i === 0) {
      return `Mid-level signal around ${hintsJoined} helps anchor a solid overall fit, even if nothing hit the top highlight tier.`;
    }
    return `Quiet alignment around ${hintsJoined} adds weight to a solid match—steady rather than flashy.`;
  }
  if (finalScore >= 50) {
    if (i === 0) {
      return `You see moderate signal around ${hintsJoined}; the overall match stays mixed but not empty.`;
    }
    return `Some alignment clusters around ${hintsJoined}, which keeps the overall read moderate rather than sharp.`;
  }
  if (finalScore >= 40) {
    if (i === 0) {
      return hp
        ? `Only partial overlap shows up so far—${hintsJoined} are the main places you can point to for some shared signal.`
        : `Only partial overlap shows up so far—${hintsJoined} is the main place you can point to for some shared signal.`;
    }
    return `A partial fit surfaces around ${hintsJoined}; elsewhere the picture stays thin.`;
  }
  if (i === 0) {
    return hp
      ? `Overall fit looks limited; ${hintsJoined} are among the few dimensions with any clear shared signal.`
      : `Overall fit looks limited; ${hintsJoined} is one of the few dimensions with any clear shared signal.`;
  }
  return hp
    ? `Weak alignment overall—${hintsJoined} are narrow lanes where anything lines up at all.`
    : `Weak alignment overall—${hintsJoined} is a narrow lane where anything lines up at all.`;
}

function emptyBody(finalScore: number, variant: number): string {
  const i = variant % 2;
  if (finalScore >= 60) {
    if (i === 0) {
      return 'The picture is mixed—no single lane reads as an obvious headline strength yet, so this deserves a slower read.';
    }
    return 'Signals are uneven; nothing jumps out as a clear shared anchor, even though the overall score still has room to breathe.';
  }
  if (finalScore >= 50) {
    if (i === 0) {
      return 'The story stays moderate: no clear shared headline yet, and the mix feels uneven.';
    }
    return 'Overlap is patchy—hard to name one convincing shared lane from what is on the page.';
  }
  if (finalScore >= 40) {
    if (i === 0) {
      return 'Only partial signal shows through; nothing is reading as a convincing shared story yet.';
    }
    return 'The match looks thin on obvious common ground—mostly partial hints rather than a clear fit.';
  }
  if (i === 0) {
    return 'Overall alignment looks weak; nothing is surfacing as a believable shared strength.';
  }
  return 'Signals stay cautious and limited—this one reads as a weak fit on what we can see.';
}

function tensionSuffix(tensionChip: string, variant: number): string {
  const t = tensionChip.toLowerCase();
  if (variant % 2 === 0) {
    return ` Main tension: ${t}.`;
  }
  return ` The friction point to watch is ${t}.`;
}

/**
 * When no chip-tier alignments exist, still name up to `max` moderate pairScore rows in prose (chips stay empty).
 */
export function pickFallbackReasonLabels(
  breakdown: BreakdownEntry[],
  max = 2,
): string[] {
  const batch = breakdown
    .filter((e) => isSignalKey(e.key) && e.pairScore >= 6)
    .sort(compareBreakdownEntry);
  const seenLabels = new Set<string>();
  const out: string[] = [];
  for (const e of batch) {
    if (out.length >= max) break;
    const label = POSITIVE_CHIP_BY_SIGNAL[e.key];
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      out.push(label);
    }
  }
  return out;
}

export function buildReasonShort(
  finalScore: number,
  friction: number,
  positiveChips: string[],
  tensionChip: string | undefined,
  breakdown: BreakdownEntry[],
): string {
  const vk = reasonVariantKey(finalScore, positiveChips, breakdown);
  let body: string;

  if (positiveChips.length === 0) {
    const hints = pickFallbackReasonLabels(breakdown);
    if (hints.length > 0) {
      body = fallbackHintsBody(finalScore, joinChips(hints), vk, hints.length);
    } else {
      body = emptyBody(finalScore, vk);
    }
  } else {
    const chipCount = positiveChips.length;
    const chipsJoined = joinChips(positiveChips);
    const chipSet = new Set(positiveChips);

    if (chipCount === 1 && finalScore < 30) {
      body = `Overall this looks weak; there's a small overlap on ${positiveChips[0]}, but it's outweighed by gaps.`;
    } else if (chipCount === 1 && finalScore >= 50 && finalScore < 60) {
      const hint =
        pickMidSecondaryHint(breakdown, chipSet) ??
        'other areas that score softer';
      body = `Primary overlap on ${positiveChips[0]}; there's also some alignment on ${hint}, but overall it stays moderate.`;
    } else {
      const variantBase = vk + (Math.floor(finalScore / 13) % 3) * 5;
      body = withChipsBody(finalScore, chipsJoined, variantBase, chipCount);
      if (chipCount === 1 && finalScore >= 30) {
        const sec = pickWeakSecondaryLabel(breakdown, chipSet);
        if (sec) {
          body += ` Softer overlap also shows around ${sec}.`;
        }
      }
    }
  }

  if (friction >= 3 && tensionChip) {
    body += tensionSuffix(tensionChip, vk);
  }

  return body;
}

function buildSharedInterestNote(shared: string[]): string | undefined {
  if (shared.length === 0) return undefined;
  const labels = shared.slice(0, 3).join(', ');
  return `You both enjoy ${labels}.`;
}

export function buildMatchExplainability(
  input: MatchExplainabilityInput,
): MatchExplainabilityDto {
  const positiveChips = pickPositiveChips(input.breakdown);
  const tensionChip = topTensionChip(input.friction, input.tensionMatrix);
  const reasonShort = buildReasonShort(
    input.finalScore,
    input.friction,
    positiveChips,
    tensionChip,
    input.breakdown,
  );
  const sharedInterestNote = buildSharedInterestNote(
    input.sharedInterests ?? [],
  );
  const interestOverlapTags = pickInterestOverlapTags(
    input.sharedInterests ?? [],
  );
  return {
    positiveChips,
    ...(tensionChip !== undefined ? { tensionChip } : {}),
    reasonShort,
    ...(sharedInterestNote !== undefined ? { sharedInterestNote } : {}),
    ...(interestOverlapTags.length > 0
      ? { interestOverlapTags }
      : {}),
  };
}
