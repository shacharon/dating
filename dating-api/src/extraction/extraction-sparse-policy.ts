/**
 * Sparse-input detection policy for extraction.
 * Determines when to cap non-null signals and confidence based on input text length/word count.
 */

import type { ExtractionEvidenceItem } from './extracted-signals.interface';
import { getTextStats } from './extraction-text-stats';

/** Input is treated as sparse if under this character count (trimmed). */
export const SPARSE_INPUT_LENGTH_THRESHOLD = 80;
/** Input is treated as sparse if under this word count. */
export const SPARSE_INPUT_WORD_THRESHOLD = 12;
/** Very generic: under this length or word count gets max 2 non-null. */
export const VERY_SPARSE_INPUT_LENGTH_THRESHOLD = 50;
export const VERY_SPARSE_INPUT_WORD_THRESHOLD = 6;

/** Sparse-text guard: max non-null for short text. */
export const SPARSE_MAX_NON_NULL = 3;
/** Very generic/short text: stricter cap (max 2 non-null). */
export const VERY_SPARSE_MAX_NON_NULL = 2;
/** Sparse-text guard: max confidence when input is sparse. */
export const SPARSE_CONFIDENCE_CAP = 0.45;

export function isSparseInput(text: string): boolean {
  const stats = getTextStats(text);
  return (
    stats.length < SPARSE_INPUT_LENGTH_THRESHOLD ||
    stats.wordCount < SPARSE_INPUT_WORD_THRESHOLD
  );
}

export function isVerySparseInput(text: string): boolean {
  const stats = getTextStats(text);
  return (
    stats.length < VERY_SPARSE_INPUT_LENGTH_THRESHOLD ||
    stats.wordCount < VERY_SPARSE_INPUT_WORD_THRESHOLD
  );
}

/**
 * When input is short/generic, cap non-null signals and confidence.
 * Very generic text: max 2; short: max 3.
 * Deterministic; no extra LLM call.
 */
export function applySparseTextGuard(
  data: {
    signals: Record<string, number | null>;
    evidence?: ExtractionEvidenceItem[];
    confidence: number;
  },
  inputText: string,
  signalKeys: readonly string[],
): {
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  confidence: number;
} {
  if (!isSparseInput(inputText))
    return { ...data, evidence: data.evidence ?? [] };
  const maxNonNull = isVerySparseInput(inputText)
    ? VERY_SPARSE_MAX_NON_NULL
    : SPARSE_MAX_NON_NULL;
  const nonNullKeys = signalKeys.filter((k) => data.signals[k] != null);
  if (
    nonNullKeys.length <= maxNonNull &&
    data.confidence <= SPARSE_CONFIDENCE_CAP
  )
    return { ...data, evidence: data.evidence ?? [] };

  const signals = { ...data.signals };
  const keepKeys = new Set<string>(nonNullKeys.slice(0, maxNonNull));
  for (const k of signalKeys) {
    if (signals[k] != null && !keepKeys.has(k)) signals[k] = null;
  }
  const evidence = (data.evidence ?? []).filter((e) => keepKeys.has(e.signal));
  const confidence = Math.min(data.confidence, SPARSE_CONFIDENCE_CAP);
  return {
    signals,
    evidence,
    confidence,
  };
}
