/**
 * Extraction confidence: coverage * signalCountFactor.
 * No formula changes.
 */

import { EXTRACTION_SIGNAL_KEYS, countNonNullSignals } from './extracted-signals.interface';

/**
 * signalCountFactor: >=12 → 1, 8-11 → 0.8, 5-7 → 0.6, <5 → 0.4.
 */
export function signalCountFactor(nonNullCount: number): number {
  if (nonNullCount >= 12) return 1;
  if (nonNullCount >= 8) return 0.8;
  if (nonNullCount >= 5) return 0.6;
  return 0.4;
}

/**
 * confidence = coverage * signalCountFactor.
 */
export function computeConfidenceFromCoverage(
  signals: Record<string, number | null>,
): number {
  const totalKeys = EXTRACTION_SIGNAL_KEYS.length;
  const nonNullCount = countNonNullSignals(signals);
  const coverage = totalKeys > 0 ? nonNullCount / totalKeys : 0;
  const factor = signalCountFactor(nonNullCount);
  return Math.min(1, coverage * factor);
}
