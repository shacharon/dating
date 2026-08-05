import type { ConversationStarterFactPack } from './conversation-starter.types';

/** Max words for a valid opener (Architect lock). */
export const OPENER_MAX_WORDS = 15;
/** Soft char cap after trim (Architect lock). */
export const OPENER_MAX_CHARS = 160;

const DENY_PHRASES = [
  'compatibility',
  'algorithm',
  'soulmate',
  'great match',
  'perfect match',
  'match score',
];

const GROUNDING_STOPWORDS = new Set([
  'about',
  'favorite',
  'into',
  'love',
  'part',
  'saw',
  'shared',
  'their',
  'what',
  'your',
  'youre',
  'both',
  'enjoy',
]);

function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

function groundingTokens(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !GROUNDING_STOPWORDS.has(w));
}

/** Pull hobby labels out of "You both enjoy hiking, cooking." */
export function parseSharedInterestLabels(note: string): string[] {
  const m = note.match(/you both enjoy\s+(.+?)\.?$/i);
  if (!m?.[1]) return [];
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/_/g, ' '));
}

/** Distinctive tokens from interests / chips / note — used to reject invented openers. */
export function collectOpenerGroundingTokens(
  factPack: ConversationStarterFactPack,
): string[] {
  const tokens = new Set<string>();
  for (const tag of factPack.sharedInterests) {
    for (const t of groundingTokens(tag)) tokens.add(t);
  }
  if (factPack.sharedInterestNote) {
    for (const label of parseSharedInterestLabels(factPack.sharedInterestNote)) {
      for (const t of groundingTokens(label)) tokens.add(t);
    }
    for (const t of groundingTokens(factPack.sharedInterestNote)) {
      tokens.add(t);
    }
  }
  for (const chip of factPack.positiveChips) {
    for (const t of groundingTokens(chip)) tokens.add(t);
  }
  return [...tokens];
}

/** Strip wrapping quotes the model sometimes adds. */
export function cleanOpenerRaw(raw: string): string {
  let t = raw.trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t.replace(/\s+/g, ' ').trim();
}

/**
 * Validate cleaned opener length + deny-list + soft grounding to fact pack.
 */
export function validateLlmOpener(
  opener: string,
  factPack?: ConversationStarterFactPack,
): { ok: true; opener: string } | { ok: false; reason: string } {
  const cleaned = cleanOpenerRaw(opener);
  if (!cleaned) {
    return { ok: false, reason: 'empty' };
  }
  if (cleaned.length > OPENER_MAX_CHARS) {
    return { ok: false, reason: 'too_long_chars' };
  }
  if (countWords(cleaned) > OPENER_MAX_WORDS) {
    return { ok: false, reason: 'too_many_words' };
  }
  const lower = cleaned.toLowerCase();
  for (const phrase of DENY_PHRASES) {
    if (lower.includes(phrase)) {
      return { ok: false, reason: `deny:${phrase}` };
    }
  }

  if (factPack) {
    const grounding = collectOpenerGroundingTokens(factPack);
    if (grounding.length > 0) {
      const hit = grounding.some((token) => lower.includes(token));
      if (!hit) {
        return { ok: false, reason: 'ungrounded' };
      }
    }
  }

  return { ok: true, opener: cleaned };
}
