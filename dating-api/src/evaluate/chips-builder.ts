/**
 * Chips builder: deterministic display-only layer for UI/explainability.
 * No LLM calls, no scoring impact, read-only transformation.
 */

import type { RawInterests, InterestItem } from '../extraction/extracted-interests.interface';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import type {
  RelationshipMotivationResult,
  AttractionTraitsResult,
  ExtendedSignals,
} from './evaluate.service';

/** Display chip for UI explainability (read-only). */
export interface Chip {
  label: string;
  source: 'interest' | 'motivation' | 'trait' | 'signal';
  strength?: 'explicit' | 'strong';
}

export interface ChipsBundle {
  self: Chip[];
  partner: Chip[];
  relationship: Chip[];
}

const MAX_CHIPS_PER_DOMAIN = 5;

/** Human-readable labels for canonical interest tags. */
const INTEREST_LABELS: Record<string, string> = {
  art: 'Art & Culture',
  beach: 'Beach Life',
  books: 'Reading',
  cooking: 'Cooking',
  dancing: 'Dancing',
  football: 'Football',
  gaming: 'Gaming',
  gym: 'Fitness',
  hiking: 'Hiking',
  home_life: 'Homebody',
  movies: 'Movies',
  music: 'Music Lover',
  nightlife: 'Nightlife',
  spirituality: 'Spirituality',
  travel: 'Travel',
  yoga: 'Yoga',
};

/** Human-readable labels for relationship motivations. */
const MOTIVATION_LABELS: Record<string, string> = {
  family_builder: 'Family Builder',
  emotional_connection: 'Deep Connection',
  status_power: 'Power Couple',
  freedom_independence: 'Independent Spirit',
};

/** Human-readable labels for attraction traits (high values only). */
const TRAIT_LABELS: Record<string, string> = {
  ambition: 'Driven & Ambitious',
  statusOrientation: 'Image Conscious',
  physicalPriority: 'Looks Matter',
  kindnessWarmth: 'Kind & Warm',
  stabilityReliability: 'Stable & Reliable',
  independenceAutonomy: 'Values Independence',
  emotionalDepth: 'Deep Talks',
  traditionalismValues: 'Traditional Values',
  financialPrudence: 'Money Smart',
};

/** Signal dimension labels (fallback for strong signals). */
const SIGNAL_LABELS: Record<string, string | undefined> = {
  ambition: 'Ambitious',
  socialBattery: 'Social Energy',
  healthBodyConsciousness: 'Fitness Focused',
  emotionalDepth: 'Emotionally Deep',
  attachmentSecurity: 'Secure Attachment',
  directness: 'Direct Communication',
  independence: 'Independent',
  traditionalism: 'Traditional Values',
  financialMindset: 'Money Smart',
  relationshipClarity: 'Clear Expectations',
  spirituality: 'Spiritual',
  lifestylePace: 'Fast Pace',
  physicalPriority: 'Physical Attraction',
  statusOrientation: 'Status Oriented',
  kindnessWarmth: 'Kind & Warm',
  stabilityReliability: 'Stable & Reliable',
};

/**
 * Build chips from rawInterests (primary source).
 * Returns chips sorted by strength (explicit > strong).
 */
function chipsFromInterests(items: InterestItem[]): Chip[] {
  const chips: Chip[] = [];
  const seen = new Set<string>();

  // Sort by strength: explicit first, then strong
  const sorted = [...items].sort((a, b) => {
    if (a.strength === 'explicit' && b.strength !== 'explicit') return -1;
    if (a.strength !== 'explicit' && b.strength === 'explicit') return 1;
    return 0;
  });

  for (const item of sorted) {
    const label = INTEREST_LABELS[item.tag];
    if (!label || seen.has(label)) continue;

    chips.push({
      label,
      source: 'interest',
      strength: item.strength,
    });
    seen.add(label);

    if (chips.length >= MAX_CHIPS_PER_DOMAIN) break;
  }

  return chips;
}

/**
 * Build chips from relationshipMotivation (relationship domain only).
 */
function chipsFromMotivation(motivation?: RelationshipMotivationResult): Chip[] {
  if (!motivation || motivation.confidence < 0.6) return [];

  const label = MOTIVATION_LABELS[motivation.relationshipMotivation];
  if (!label) return [];

  return [
    {
      label,
      source: 'motivation',
      strength: motivation.confidence >= 0.8 ? 'strong' : undefined,
    },
  ];
}

/**
 * Build chips from attractionTraits (partner domain only).
 * Only traits with score >= 7 are included.
 */
function chipsFromAttractionTraits(
  attractionTraits?: AttractionTraitsResult,
): Chip[] {
  if (!attractionTraits || attractionTraits.confidence < 0.6) return [];

  const chips: Chip[] = [];
  const seen = new Set<string>();

  // Sort traits by score descending
  const traits = Object.entries(attractionTraits.attraction)
    .filter(([_, score]) => score >= 7)
    .sort((a, b) => b[1] - a[1]);

  for (const [key, score] of traits) {
    const label = TRAIT_LABELS[key];
    if (!label || seen.has(label)) continue;

    chips.push({
      label,
      source: 'trait',
      strength: score >= 9 ? 'strong' : undefined,
    });
    seen.add(label);

    if (chips.length >= MAX_CHIPS_PER_DOMAIN) break;
  }

  return chips;
}

/**
 * Build chips from strong signals (fallback when other sources are sparse).
 * Primary threshold: value >= 8.
 * Adaptive fallback: if < 2 chips, allow one pass with value >= 7.
 */
function chipsFromSignals(signals: ExtractedSignals): Chip[] {
  const chips: Chip[] = [];
  const seen = new Set<string>();

  // Primary pass: signals with value >= 8
  const strongSignals = Object.entries(signals.signals)
    .filter(([_, value]) => value != null && value >= 8)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

  for (const [key, value] of strongSignals) {
    const label = SIGNAL_LABELS[key];
    if (!label || seen.has(label)) continue;

    chips.push({
      label,
      source: 'signal',
      strength: (value ?? 0) >= 9 ? 'strong' : undefined,
    });
    seen.add(label);

    if (chips.length >= MAX_CHIPS_PER_DOMAIN) break;
  }

  // Adaptive fallback: if < 2 chips, allow value >= 7
  if (chips.length < 2) {
    const mediumSignals = Object.entries(signals.signals)
      .filter(([_, value]) => value != null && value >= 7 && value < 8)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));

    for (const [key, value] of mediumSignals) {
      const label = SIGNAL_LABELS[key];
      if (!label || seen.has(label)) continue;

      chips.push({
        label,
        source: 'signal',
        // No strength marker for fallback chips (value 7)
      });
      seen.add(label);

      if (chips.length >= MAX_CHIPS_PER_DOMAIN) break;
    }
  }

  return chips;
}

/**
 * Deduplicate chips by label (case-insensitive semantic dedup).
 * Preserve order (first occurrence wins).
 * Filter out chips with undefined/empty labels.
 */
function deduplicate(chips: Chip[]): Chip[] {
  const seen = new Set<string>();
  const result: Chip[] = [];

  for (const chip of chips) {
    if (!chip.label || typeof chip.label !== 'string') continue;
    const key = chip.label.toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(chip);
  }

  return result;
}

/**
 * Merge chips from multiple sources, deduplicate, and cap at MAX_CHIPS_PER_DOMAIN.
 * Priority: interest > motivation > trait > signal.
 */
function mergeChips(...sources: Chip[][]): Chip[] {
  const merged = sources.flat();
  const deduped = deduplicate(merged);
  return deduped.slice(0, MAX_CHIPS_PER_DOMAIN);
}

/**
 * Build chips bundle for all three domains (self, partner, relationship).
 * Pure deterministic function; no LLM calls, no side effects.
 */
export function buildChips(
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
  rawInterests?: RawInterests,
  extendedSignals?: ExtendedSignals,
): ChipsBundle {
  // Self domain: interests + fallback signals
  const selfInterestChips = rawInterests
    ? chipsFromInterests(rawInterests.self)
    : [];
  const selfSignalChips = chipsFromSignals(self);
  const selfChips = mergeChips(selfInterestChips, selfSignalChips);

  // Partner domain: interests + attraction traits + fallback signals
  const partnerInterestChips = rawInterests
    ? chipsFromInterests(rawInterests.partner)
    : [];
  const partnerTraitChips = extendedSignals?.attractionTraits
    ? chipsFromAttractionTraits(extendedSignals.attractionTraits)
    : [];
  const partnerSignalChips = chipsFromSignals(partner);
  const partnerChips = mergeChips(
    partnerInterestChips,
    partnerTraitChips,
    partnerSignalChips,
  );

  // Relationship domain: interests + motivation + fallback signals
  const relationshipInterestChips = rawInterests
    ? chipsFromInterests(rawInterests.relationship)
    : [];
  const relationshipMotivationChips = extendedSignals?.relationshipMotivation
    ? chipsFromMotivation(extendedSignals.relationshipMotivation)
    : [];
  const relationshipSignalChips = chipsFromSignals(relationship);
  const relationshipChips = mergeChips(
    relationshipInterestChips,
    relationshipMotivationChips,
    relationshipSignalChips,
  );

  return {
    self: selfChips,
    partner: partnerChips,
    relationship: relationshipChips,
  };
}
