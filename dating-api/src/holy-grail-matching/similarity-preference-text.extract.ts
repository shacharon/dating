/**
 * Deterministic `similarityPreference` extraction from free-text profile fields.
 * Only allowlisted phrases count as evidence — no inference beyond explicit matches.
 */

import type { SimilarityPreference } from '../canonical/matching-canonical.types';

export type SimilarityPreferenceTextExtraction = {
  /** `undefined` = no allowlisted evidence; `null` = conflicting evidence; else single enum. */
  readonly value: SimilarityPreference | null | undefined;
  /** Matched allowlist literals (audit / UI), empty when `value === undefined`. */
  readonly evidence: readonly string[];
};

const BALANCED_PHRASES_EN = ['not exactly like me', 'mix', 'balanced'] as const;

const DIFFERENT_PHRASES_EN = ['different from me', 'opposite of me'] as const;
const DIFFERENT_PHRASES_HE = ['שונה ממני', 'הפכים'] as const;

const SIMILAR_PHRASES_EN = ['similar to me', 'same type'] as const;
const SIMILAR_PHRASES_HE = ['כמוני', 'דומה לי'] as const;

function combineFields(input: {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
}): { full: string; lower: string } {
  const parts = [input.aboutMe, input.aboutPartner, input.aboutRelationship]
    .map((s) => (typeof s === 'string' ? s : ''))
    .filter((s) => s.length > 0);
  const full = parts.join('\n');
  return { full, lower: full.toLowerCase() };
}

function findEnglishPhrases(
  lower: string,
  phrases: readonly string[],
  wordBoundary: Set<string>,
): string[] {
  const found: string[] = [];
  for (const p of phrases) {
    if (wordBoundary.has(p)) {
      const re = new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i');
      if (re.test(lower)) found.push(p);
    } else if (lower.includes(p)) {
      found.push(p);
    }
  }
  return found;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectBalanced(lower: string): string[] {
  const wordBoundary = new Set<string>(['mix', 'balanced']);
  const multiWord = BALANCED_PHRASES_EN.filter((p) => !wordBoundary.has(p));
  return [
    ...findEnglishPhrases(lower, multiWord, new Set()),
    ...findEnglishPhrases(lower, [...wordBoundary], wordBoundary),
  ];
}

function collectDifferent(full: string, lower: string): string[] {
  const en = findEnglishPhrases(
    lower,
    [...DIFFERENT_PHRASES_EN],
    new Set([...DIFFERENT_PHRASES_EN]),
  );
  const he: string[] = [];
  for (const p of DIFFERENT_PHRASES_HE) {
    if (full.includes(p)) he.push(p);
  }
  return [...en, ...he];
}

function hasNegatedLikeMe(lower: string): boolean {
  return (
    /\bnot exactly like me\b/.test(lower) ||
    /\bnot like me\b/.test(lower) ||
    /\bnothing like me\b/.test(lower) ||
    /\bunlike me\b/.test(lower)
  );
}

function enPhraseAtWordBoundaries(lower: string, p: string): boolean {
  return new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(lower);
}

function collectSimilar(full: string, lower: string): string[] {
  const en: string[] = [];
  for (const p of SIMILAR_PHRASES_EN) {
    if (enPhraseAtWordBoundaries(lower, p)) en.push(p);
  }
  const he: string[] = [];
  for (const p of SIMILAR_PHRASES_HE) {
    if (full.includes(p)) he.push(p);
  }
  let likeMe = false;
  if (/\blike me\b/.test(lower) && !hasNegatedLikeMe(lower)) {
    likeMe = true;
  }
  const out = [...en, ...he];
  if (likeMe) out.push('like me');
  return out;
}

/**
 * Extract `similarityPreference` using only fixed phrase matches in profile text.
 * - One category matched → that enum.
 * - Two or more categories → `null` (unclear).
 * - None → `undefined` (omit / sparse).
 */
export function extractSimilarityPreferenceFromFreeText(input: {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
}): SimilarityPreferenceTextExtraction {
  const { full, lower } = combineFields(input);
  if (!full.trim()) {
    return { value: undefined, evidence: [] };
  }

  const balancedHits = collectBalanced(lower);
  const differentHits = collectDifferent(full, lower);
  const similarHits = collectSimilar(full, lower);

  const hasB = balancedHits.length > 0;
  const hasD = differentHits.length > 0;
  const hasS = similarHits.length > 0;

  const categories = Number(hasB) + Number(hasD) + Number(hasS);
  if (categories > 1) {
    return {
      value: null,
      evidence: [...balancedHits, ...differentHits, ...similarHits],
    };
  }
  if (hasB) {
    return { value: 'balanced', evidence: balancedHits };
  }
  if (hasD) {
    return { value: 'different', evidence: differentHits };
  }
  if (hasS) {
    return { value: 'similar', evidence: similarHits };
  }
  return { value: undefined, evidence: [] };
}
