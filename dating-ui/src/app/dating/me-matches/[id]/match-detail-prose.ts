import type { MeMatchDetailDto } from '@/lib/me-profile-api';

export type MatchDetailProse =
  | { kind: 'narrative'; text: string }
  | { kind: 'short'; text: string };

/** Prefer long-form narrative; fall back to primaryTakeaway only (never reasonShort). */
export function resolveDetailProse(
  data: Pick<
    MeMatchDetailDto,
    'matchNarrative' | 'recommendation' | 'explainability'
  >,
): MatchDetailProse | null {
  const narrative = data.matchNarrative?.trim();
  if (narrative) {
    return { kind: 'narrative', text: narrative };
  }
  const short = data.recommendation?.primaryTakeaway?.trim() || '';
  if (short) {
    return { kind: 'short', text: short };
  }
  return null;
}

/** Split a single prose block into sentences (keeps trailing punctuation). */
function splitIntoSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const matches = trimmed.match(/[^.!?]+[.!?]+(?:["'\u201d\u2019])?[^\S\n]*|[^.!?]+$/g);
  if (!matches) return [trimmed];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

/**
 * Split narrative into short paragraphs for readable detail UI.
 * Respects existing newlines; otherwise groups sentences into ~2–3 paragraphs.
 */
export function splitNarrativeParagraphs(text: string): string[] {
  const byNewline = text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (byNewline.length > 1) return byNewline;

  const block = byNewline[0] ?? text.trim();
  if (!block) return [];

  const sentences = splitIntoSentences(block);
  if (sentences.length <= 2) return [sentences.join(' ') || block];

  const paragraphCount = Math.min(3, Math.max(2, Math.ceil(sentences.length / 3)));
  const perPara = Math.ceil(sentences.length / paragraphCount);
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += perPara) {
    paragraphs.push(sentences.slice(i, i + perPara).join(' '));
  }
  return paragraphs;
}
