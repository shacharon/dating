/**
 * Canonical V2 projection: map ExtractionV2Result → canonical arrays for DB.
 * Implements normalization rules for interests and negatives.
 */

import type { ExtractionV2Result } from '../extraction/extraction-v2.service';
import type { InterestItem } from '../extraction/extracted-interests.interface';
import type { NegativeItem } from '../extraction/extracted-negatives.interface';
import { INTEREST_CANONICAL_TAG_SET } from '../extraction/extracted-interests.interface';

export interface CanonicalArrays {
  interests_self: string[];
  interests_partner: string[];
  negatives_self: string[];
  negatives_partner: string[];
  soft_no: string[];
  hard_no: string[];
}

export interface CanonicalSignalScalars {
  relationship_clarity_self: number | null;
  relationship_clarity_partner: number | null;
  relationship_clarity_relationship: number | null;
}

export interface CanonicalProjection extends CanonicalArrays, CanonicalSignalScalars {}

/**
 * Project V2 extraction to canonical array fields.
 * Rules:
 * - Interests: extract tags only, lowercase, dedupe
 * - Negatives: filter confidence >= 0.3, extract tags, lowercase, dedupe
 * - soft_no: negatives with strength 'soft', confidence >= 0.3
 * - hard_no: negatives with strength 'hard', confidence >= 0.3
 */
export function projectToCanonicalArrays(extraction: ExtractionV2Result): CanonicalArrays {
  return {
    interests_self: normalizeInterestTags(extraction.interests.self),
    interests_partner: normalizeInterestTags(extraction.interests.partner),
    negatives_self: normalizeNegativeTags(extraction.negatives.self),
    negatives_partner: normalizeNegativeTags(extraction.negatives.partner),
    soft_no: normalizeSoftNo(extraction.negatives.self, extraction.negatives.partner),
    hard_no: normalizeHardNo(extraction.negatives.self, extraction.negatives.partner),
  };
}

/**
 * Project V2 extraction to canonical signal scalars.
 * Extracts relationshipClarity from each domain (self, partner, relationship).
 * Returns integers in [1-10] range or null if missing.
 */
export function projectToCanonicalSignalScalars(extraction: ExtractionV2Result): CanonicalSignalScalars {
  return {
    relationship_clarity_self: extractSignalValue(extraction.signals.self, 'relationshipClarity'),
    relationship_clarity_partner: extractSignalValue(extraction.signals.partner, 'relationshipClarity'),
    relationship_clarity_relationship: extractSignalValue(extraction.signals.relationship, 'relationshipClarity'),
  };
}

/**
 * Full canonical projection: arrays + signal scalars.
 */
export function projectToCanonical(extraction: ExtractionV2Result): CanonicalProjection {
  return {
    ...projectToCanonicalArrays(extraction),
    ...projectToCanonicalSignalScalars(extraction),
  };
}

/**
 * Extract integer signal value from signals object.
 * Returns null if missing or invalid.
 */
function extractSignalValue(signals: Record<string, number>, key: string): number | null {
  const value = signals?.[key];
  if (typeof value === 'number' && !isNaN(value)) {
    return Math.round(value);
  }
  return null;
}

/**
 * Normalize interest items to canonical tag array.
 * - Extract tag field only
 * - Lowercase and trim
 * - Filter to canonical tags only
 * - Deduplicate
 * - Sort alphabetically
 */
function normalizeInterestTags(items: InterestItem[]): string[] {
  const tags = new Set<string>();

  for (const item of items) {
    const tag = item.tag.toLowerCase().trim();
    if (INTEREST_CANONICAL_TAG_SET.has(tag)) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}

/**
 * Normalize negative items to canonical tag array.
 * - Filter by confidence >= 0.3
 * - Extract tag field only
 * - Lowercase and trim
 * - Deduplicate
 * - Sort alphabetically
 */
function normalizeNegativeTags(items: NegativeItem[]): string[] {
  const tags = new Set<string>();

  for (const item of items) {
    if (item.confidence < 0.3) continue;

    const tag = item.tag.toLowerCase().trim();
    if (tag) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}

/**
 * Extract soft negatives (strength = 'soft') from self + partner domains.
 * Confidence filter: >= 0.3
 */
function normalizeSoftNo(selfItems: NegativeItem[], partnerItems: NegativeItem[]): string[] {
  const tags = new Set<string>();

  for (const item of [...selfItems, ...partnerItems]) {
    if (item.confidence < 0.3) continue;
    if (item.strength !== 'soft') continue;

    const tag = item.tag.toLowerCase().trim();
    if (tag) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}

/**
 * Extract hard negatives (strength = 'hard') from self + partner domains.
 * Confidence filter: >= 0.3
 */
function normalizeHardNo(selfItems: NegativeItem[], partnerItems: NegativeItem[]): string[] {
  const tags = new Set<string>();

  for (const item of [...selfItems, ...partnerItems]) {
    if (item.confidence < 0.3) continue;
    if (item.strength !== 'hard') continue;

    const tag = item.tag.toLowerCase().trim();
    if (tag) {
      tags.add(tag);
    }
  }

  return Array.from(tags).sort();
}
