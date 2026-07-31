import type { MatchNarrativeFactPack } from './match-narrative.types';
import { findBannedPhrase } from './match-narrative-voice';

/** Too-generic words that would ground almost any dating prose. */
const GROUNDING_STOPWORDS = new Set([
  'about',
  'being',
  'could',
  'daily',
  'levels',
  'matter',
  'mutual',
  'relationship',
  'should',
  'their',
  'together',
  'which',
  'would',
  'your',
  'both',
  'value',
  'values',
  'share',
  'shared',
  'similar',
  'approach',
]);

function countSentences(text: string): number {
  const parts = text
    .trim()
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return parts.length;
}

/** Distinctive tokens from evidence / interest text. */
export function groundingTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 5 && !GROUNDING_STOPWORDS.has(w));
}

function collectGroundingTokens(factPack: MatchNarrativeFactPack): string[] {
  const tokens = new Set<string>();
  for (const trait of factPack.traits) {
    for (const t of groundingTokens(trait.evidence)) {
      tokens.add(t);
    }
  }
  if (factPack.sharedInterests) {
    for (const tag of factPack.sharedInterests) {
      for (const t of groundingTokens(tag)) {
        tokens.add(t);
      }
    }
  }
  if (factPack.sharedInterestNote) {
    for (const t of groundingTokens(factPack.sharedInterestNote)) {
      tokens.add(t);
    }
  }
  if (factPack.profileExcerpts) {
    for (const ex of factPack.profileExcerpts) {
      for (const t of groundingTokens(ex.text)) {
        tokens.add(t);
      }
    }
  }
  return [...tokens];
}

/**
 * Soft validation for LLM narrative (bans + evidence/interest/excerpt grounding).
 */
export function validateLlmNarrative(
  narrative: string,
  factPack: MatchNarrativeFactPack,
): { ok: true } | { ok: false; reason: string } {
  const trimmed = narrative.trim();
  if (!trimmed) {
    return { ok: false, reason: 'empty' };
  }

  const sentences = countSentences(trimmed);
  if (sentences < 3) {
    return { ok: false, reason: `too_few_sentences:${sentences}` };
  }
  if (sentences > 16) {
    return { ok: false, reason: `too_many_sentences:${sentences}` };
  }

  const banned = findBannedPhrase(trimmed);
  if (banned != null) {
    return { ok: false, reason: `banned_phrase:${banned}` };
  }

  const grounding = collectGroundingTokens(factPack);
  if (grounding.length === 0) {
    return { ok: true };
  }

  const lower = trimmed.toLowerCase();
  for (const token of grounding) {
    if (lower.includes(token)) {
      return { ok: true };
    }
  }

  return { ok: false, reason: 'ungrounded' };
}
