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

/** Split narrative on blank lines / newlines into non-empty paragraphs. */
export function splitNarrativeParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}
