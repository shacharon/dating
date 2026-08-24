/**
 * Read-only V1 extraction stage snapshots for audits.
 * Mirrors ExtractionService.extract post-LLM steps; does not alter production extract().
 */

import {
  EXTRACTION_SIGNAL_KEYS,
  EXTRACTION_SIGNAL_KEYS_SET,
  type ExtractedSignals,
  type ExtractionDomain,
  type ExtractionEvidenceItem,
} from '../extracted-signals.interface';
import {
  KEY_ALIASES,
  normalizeKeys,
  normalizeRawExtraction,
} from '../core/extraction-normalization';
import { validateAndClean } from '../core/extraction-output.cleaner';
import {
  DOMAIN_ALLOWED_SIGNAL_KEYS,
  quoteContainsBannedMarkers,
  reasonMeetsContract,
  validateExtraction,
} from './extraction-strict-validation';

/**
 * Audit mirror of production validateAndClean (no strip logging).
 * Shares implementation with ExtractionService via extraction-output.cleaner.
 */
export function validateAndCleanMirror(
  data: ExtractedSignals,
  requestedDomain: ExtractionDomain,
): ExtractedSignals {
  return validateAndClean(data, requestedDomain);
}

export interface V1PipelineSnapshots {
  /** First structured parse from LLM JSON (normalizeRawExtraction). */
  rawLlmOutput: ExtractedSignals;
  /** After normalizeRawExtraction + normalizeKeys (alias normalization). */
  afterNormalize: ExtractedSignals;
  afterValidateClean: ExtractedSignals;
  afterValidateExtraction: ExtractedSignals;
}

export function computeV1PipelineSnapshots(
  llmParsedValue: unknown,
  domain: ExtractionDomain,
  text: string,
): V1PipelineSnapshots {
  const rawLlmOutput = normalizeRawExtraction(llmParsedValue, domain);

  const afterNorm = { ...rawLlmOutput, signals: { ...rawLlmOutput.signals } };
  const nk = normalizeKeys(afterNorm.signals);
  afterNorm.signals = nk.normalizedSignals;

  const afterValidateClean = validateAndCleanMirror(afterNorm, domain);

  const afterValidateExtraction = validateExtraction(text.trim(), {
    ...afterValidateClean,
    signals: { ...afterValidateClean.signals },
    evidence: afterValidateClean.evidence.map((e) => ({ ...e })),
  });

  return {
    rawLlmOutput,
    afterNormalize: afterNorm,
    afterValidateClean,
    afterValidateExtraction,
  };
}

function evidenceKey(e: ExtractionEvidenceItem): string {
  return `${e.signal}\t${e.quote}\t${e.reason}`;
}

export function officialSignalDiffKeys(
  a: Record<string, number | null>,
  b: Record<string, number | null>,
): string[] {
  const changed: string[] = [];
  for (const k of EXTRACTION_SIGNAL_KEYS) {
    if (a[k] !== b[k]) changed.push(k);
  }
  return changed;
}

export type EvidenceDropReason =
  | 'unknown_signal_key'
  | 'quote_not_substring'
  | 'banned_marker_in_quote'
  | 'reason_contract_fail'
  | 'signal_not_in_domain_allowlist'
  | 'max_evidence_cap'
  | 'other';

export function classifyEvidenceRowIssue(
  e: ExtractionEvidenceItem,
  text: string,
  domain: ExtractionDomain,
): EvidenceDropReason {
  const allowed = new Set(DOMAIN_ALLOWED_SIGNAL_KEYS[domain]);
  const sig = KEY_ALIASES[String(e.signal).trim()] ?? String(e.signal).trim();
  if (!EXTRACTION_SIGNAL_KEYS_SET.has(sig)) return 'unknown_signal_key';
  if (!allowed.has(sig)) return 'signal_not_in_domain_allowlist';
  if (quoteContainsBannedMarkers(e.quote)) return 'banned_marker_in_quote';
  const q = String(e.quote).trim();
  if (q.length === 0 || !text.includes(q)) return 'quote_not_substring';
  if (!reasonMeetsContract(e.reason)) return 'reason_contract_fail';
  return 'other';
}

/** Rows in before missing from after (by signal+quote+reason). */
export function evidenceRowsDropped(
  before: ExtractionEvidenceItem[],
  after: ExtractionEvidenceItem[],
): ExtractionEvidenceItem[] {
  const afterSet = new Set(after.map(evidenceKey));
  return before.filter((e) => !afterSet.has(evidenceKey(e)));
}

export function explainEvidenceDrops(
  dropped: ExtractionEvidenceItem[],
  text: string,
  domain: ExtractionDomain,
): { reason: EvidenceDropReason; count: number }[] {
  const counts = new Map<EvidenceDropReason, number>();
  for (const e of dropped) {
    const r = classifyEvidenceRowIssue(e, text, domain);
    counts.set(r, (counts.get(r) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}
