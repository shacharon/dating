/**
 * Plain one-line list TLDR from structured chips (Sprint 23 Story 1).
 * Deterministic, no LLM, no chip-label display strings.
 */

import { CHIP_TO_TRAIT } from './match-explanation-traits';

export const LIST_TLDR_MAX_CHARS = 120;

export type BuildPlainMatchListTldrInput = {
  finalScore: number;
  positiveChips: readonly string[];
  /** Reserved for thin-chip path; unused in v1 templates. */
  sharedInterestNote?: string;
};

function collectListPhrases(positiveChips: readonly string[]): string[] {
  const phrases: string[] = [];
  for (const chip of positiveChips) {
    const meta = CHIP_TO_TRAIT[chip];
    if (!meta) continue;
    phrases.push(meta.listPhrase);
    if (phrases.length >= 2) break;
  }
  return phrases;
}

function bandOnlyLine(finalScore: number): string {
  if (finalScore >= 60) {
    return 'Some real overlap — open to see why.';
  }
  if (finalScore >= 40) {
    return 'A few touchpoints — open to see why.';
  }
  return 'Limited overlap — open only if curious.';
}

/** Exported for unit tests — hard-cap helper. */
export function truncateListTldrLine(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const base = lastSpace > 20 ? slice.slice(0, lastSpace) : slice;
  return `${base.trimEnd()}…`;
}

/**
 * One short plain-English line for match list cards.
 */
export function buildPlainMatchListTldr(
  input: BuildPlainMatchListTldrInput,
): string {
  const phrases = collectListPhrases(input.positiveChips);
  let line: string;
  if (phrases.length >= 2) {
    line = `You both share ${phrases[0]} and ${phrases[1]}.`;
  } else if (phrases.length === 1) {
    line = `Clear overlap: ${phrases[0]}.`;
  } else {
    line = bandOnlyLine(input.finalScore);
  }
  return truncateListTldrLine(line, LIST_TLDR_MAX_CHARS);
}
