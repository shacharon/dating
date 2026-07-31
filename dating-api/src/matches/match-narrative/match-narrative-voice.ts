/**
 * Shared voice rules for match narrative (Sprint 22 Story 4 + Sprint 23 Story 2).
 * Used by system prompt text + output validator — keep in sync.
 */

/** Case-insensitive substrings that reject LLM narrative. Longer phrases first. */
export const BANNED_NARRATIVE_PHRASES: readonly string[] = [
  'ambition alignment',
  'alignment',
  'solid foundation',
  'meaningful conversations',
  'meaningful connections',
  'meaningful connection',
  'promising basis',
  'potential relationship',
  'shared values and connections',
  'worth a closer look',
  'take a closer look',
  'one-on-one setting',
  'in a one-on-one',
  'commonalities play out',
  'mutual appreciation',
  'explore this further',
  'compatibility',
  'friction',
  'percent',
  '%',
];

/** Metric-style "score" mentions (avoid false hits inside longer words). */
const SCORE_METRIC_RE = /\bscores?\b/i;

export const LLM_SAFE_NEXT_ACTION =
  'Ask one concrete question tied to the evidence or shared interests.';

export function findBannedPhrase(text: string): string | null {
  const lower = text.toLowerCase();
  for (const phrase of BANNED_NARRATIVE_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      return phrase;
    }
  }
  if (SCORE_METRIC_RE.test(text)) {
    return 'score';
  }
  return null;
}

export function containsBannedPhrase(text: string): boolean {
  return findBannedPhrase(text) != null;
}

/**
 * Soft product CTAs must not enter the LLM JSON (they teach banned closers).
 */
export function nextActionForLlm(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  if (containsBannedPhrase(raw)) {
    return LLM_SAFE_NEXT_ACTION;
  }
  return raw.trim();
}

/** Known tension chip → plain English note (no "alignment"). */
const TENSION_CHIP_NOTES: Record<string, string> = {
  'Emotional depth gap':
    'You may want different levels of emotional intensity — worth naming early.',
  'Different pace of life':
    'You may move through daily life at different speeds — worth naming early.',
  'Social rhythm gap':
    'Your social energy may not always match — worth naming early.',
  'Closeness vs space':
    'You may want different amounts of closeness versus space — worth naming early.',
  'Different money mindset':
    'You may see money and security differently — worth naming early.',
};

/**
 * Plain tension note for the LLM prompt. Omits jargon chip labels when needed.
 */
export function tensionNoteFromChip(tensionChip: string): string {
  const trimmed = tensionChip.trim();
  const mapped = TENSION_CHIP_NOTES[trimmed];
  if (mapped) return mapped;
  if (containsBannedPhrase(trimmed) || /alignment/i.test(trimmed)) {
    return 'One area may need an early honest conversation.';
  }
  return `Something to watch: ${trimmed.toLowerCase()}.`;
}
