import {
  EXTRACTION_SIGNAL_KEYS,
  EXTRACTION_SIGNAL_KEYS_SET,
  MAX_EVIDENCE_ITEMS,
  type ExtractedSignals,
  type ExtractionDomain,
} from '../extracted-signals.interface';
import {
  KEY_ALIASES,
  normalizeRawInterestTags,
} from './extraction-normalization';

export type ValidateAndCleanStripLog = (payload: {
  event: 'validateAndClean_stripped';
  key: string;
  value: unknown;
  reason: 'nan' | 'outOfRange';
}) => void;

/**
 * Build output from allowlist only. Round to int, enforce 1–10 or null.
 * Evidence filtered to official keys; alias rewritten to official.
 *
 * Technical cleanup only: no semantic inference or context-based modification.
 */
export function validateAndClean(
  data: ExtractedSignals,
  requestedDomain: ExtractionDomain,
  onStripped?: ValidateAndCleanStripLog,
): ExtractedSignals {
  const normalizedSignals = data.signals ?? {};

  const signals: Record<string, number | null> = {};
  for (const key of EXTRACTION_SIGNAL_KEYS) {
    const value = normalizedSignals[key];
    if (value === null || value === undefined) {
      signals[key] = null;
      continue;
    }
    const n = Number(value);
    const rounded = Number.isFinite(n) ? Math.round(n) : NaN;
    if (Number.isNaN(rounded) || rounded < 1 || rounded > 10) {
      signals[key] = null;
      onStripped?.({
        event: 'validateAndClean_stripped',
        key,
        value,
        reason: Number.isNaN(rounded) ? 'nan' : 'outOfRange',
      });
    } else {
      signals[key] = rounded;
    }
  }

  const confidence = data.confidence ?? 0.5;

  const evidence = (data.evidence ?? [])
    .map((item) => {
      const s = String(item.signal).trim();
      const officialSignal = KEY_ALIASES[s] ?? s;
      const reason = typeof item.reason === 'string' ? item.reason : '';
      return { ...item, signal: officialSignal, reason };
    })
    .filter((item) => EXTRACTION_SIGNAL_KEYS_SET.has(item.signal))
    .slice(0, MAX_EVIDENCE_ITEMS);

  const rawInterests = normalizeRawInterestTags(data.rawInterests);

  return {
    domain: requestedDomain,
    signals,
    evidence,
    version: data.version ?? 'v1',
    confidence,
    notes: data.notes,
    ...(rawInterests.length > 0 ? { rawInterests } : {}),
  };
}
