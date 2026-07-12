/**
 * Signal count limits: max 12 non-null, min 6 when evidence exists.
 * Run AFTER text inference. Caps excess signals; does NOT fabricate new ones.
 * No threshold changes.
 */

import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  SHADOW_SIGNAL_KEYS_SET,
} from './extracted-signals.interface';
import type { ExtractedSignals } from './extracted-signals.interface';
import { isSparseInput } from './extraction-sparse-policy';

const SIGNAL_COUNT_MAX = 12;
const SIGNAL_COUNT_MIN = 6;

const PRIORITY_SIGNAL_KEYS: ReadonlySet<string> = new Set([
  'lifestylePace',
  'independence',
  'socialBattery',
  'relationshipClarity',
  'directness',
  'emotionalDepth',
  'healthBodyConsciousness',
]);

export function enforceSignalCountLimits(
  data: ExtractedSignals,
  inputText: string,
): ExtractedSignals {
  const nonNullOfficial = OFFICIAL_EXTRACTION_SIGNAL_KEYS.filter(
    (k) => data.signals[k] != null,
  ).map((k) => ({ key: k, value: data.signals[k]! }));

  if (
    nonNullOfficial.length <= SIGNAL_COUNT_MAX &&
    nonNullOfficial.length >= SIGNAL_COUNT_MIN
  ) {
    return data;
  }

  const signals = { ...data.signals };
  let evidence = [...(data.evidence ?? [])];
  const coverageNotes = [...(data.coverageNotes ?? [])];

  if (nonNullOfficial.length > SIGNAL_COUNT_MAX) {
    const evidenceKeys = new Set(evidence.map((e) => e.signal));
    const sorted = [...nonNullOfficial].sort((a, b) => {
      const aPri = PRIORITY_SIGNAL_KEYS.has(a.key) ? 1 : 0;
      const bPri = PRIORITY_SIGNAL_KEYS.has(b.key) ? 1 : 0;
      if (aPri !== bPri) return bPri - aPri;
      const aEv = evidenceKeys.has(a.key) ? 1 : 0;
      const bEv = evidenceKeys.has(b.key) ? 1 : 0;
      if (aEv !== bEv) return bEv - aEv;
      return Math.abs(b.value - 5) - Math.abs(a.value - 5);
    });
    const keepKeys = new Set<string>(
      sorted.slice(0, SIGNAL_COUNT_MAX).map((e) => e.key),
    );
    for (const entry of nonNullOfficial) {
      if (!keepKeys.has(entry.key)) signals[entry.key] = null;
    }
    evidence = evidence.filter(
      (e) => keepKeys.has(e.signal) || SHADOW_SIGNAL_KEYS_SET.has(e.signal),
    );
    coverageNotes.push(`capped to ${SIGNAL_COUNT_MAX} signals`);
  }

  if (
    nonNullOfficial.length < SIGNAL_COUNT_MIN &&
    !isSparseInput(inputText) &&
    inputText.trim().length > 0
  ) {
    coverageNotes.push(
      `only ${nonNullOfficial.length} signals extracted (target min ${SIGNAL_COUNT_MIN})`,
    );
  }

  return {
    ...data,
    signals,
    evidence: evidence.slice(0, MAX_EVIDENCE_ITEMS),
    coverageNotes,
  };
}
