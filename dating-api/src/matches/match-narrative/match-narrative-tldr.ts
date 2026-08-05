/**
 * Deterministic WHY TLDR: leading sentence(s) of the full match narrative.
 * Same words as profile WHY — no coach templates, no second LLM.
 */

export const NARRATIVE_TLDR_MAX_CHARS = 160;

/** Prefer a second sentence only when the first is shorter than this. */
const SECOND_SENTENCE_IF_FIRST_SHORTER_THAN = 80;

function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const matches = trimmed.match(
    /[^.!?]+[.!?]+(?:["'\u201d\u2019])?[^\S\n]*|[^.!?]+$/g,
  );
  if (!matches) return [trimmed];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

function truncateAtWordBoundary(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

/**
 * 1–2 leading sentences from `narrative`, hard-capped.
 * Empty input → empty string.
 */
export function buildNarrativeTldr(narrative: string): string {
  const sentences = splitIntoSentences(narrative);
  if (sentences.length === 0) return '';

  let tldr = sentences[0]!;
  if (
    sentences.length > 1 &&
    tldr.length < SECOND_SENTENCE_IF_FIRST_SHORTER_THAN
  ) {
    tldr = `${tldr} ${sentences[1]}`;
  }

  return truncateAtWordBoundary(tldr.trim(), NARRATIVE_TLDR_MAX_CHARS);
}
