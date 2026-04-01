/**
 * Strict post-parse validation: every persisted non-null signal must have
 * evidence with exact quote substring, banned-marker-free quote, and a short reason (≤8 words).
 * 
 * Final validation gate: can null invalid signals, never infers or invents values.
 */

import { KEY_ALIASES } from './extraction-normalization';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  type ExtractedSignals,
  type ExtractionDomain,
  type ExtractionEvidenceItem,
} from './extracted-signals.interface';

/** Allowed signal keys per domain (must match extractor prompts). */
export const DOMAIN_ALLOWED_SIGNAL_KEYS: Record<ExtractionDomain, readonly string[]> = {
  self: [
    'emotionalDepth',
    'attachmentSecurity',
    'directness',
    'independence',
    'socialBattery',
    'lifestylePace',
    'ambition',
    'healthBodyConsciousness',
    'spirituality',
    'intellectualCuriosity',
    'conflictStyle',
    'noveltyVsRoutine',
    'structureChaosTolerance',
    'relationshipClarity',
  ],
  relationship: [
    'emotionalDepth',
    'attachmentSecurity',
    'relationshipClarity',
    'traditionalism',
    'spirituality',
    'lifestylePace',
    'socialBattery',
  ],
  partner: [
    'emotionalDepth',
    'relationshipClarity',
    'traditionalism',
    'lifestylePace',
    'socialBattery',
    'physicalPriority',
    'intellectualCuriosity',
    'conflictStyle',
  ],
};

export function allowedSignalKeyCountForDomain(domain: ExtractionDomain): number {
  return DOMAIN_ALLOWED_SIGNAL_KEYS[domain].length;
}

function officializeEvidenceSignal(signal: string): string {
  const t = String(signal).trim();
  return KEY_ALIASES[t] ?? t;
}

/** Max words allowed in evidence.reason (whitespace-separated). */
export const MAX_EVIDENCE_REASON_WORDS = 8;

export function quoteContainsBannedMarkers(quote: string): boolean {
  const lower = quote.toLowerCase();
  return (
    lower.includes('inferred:') ||
    lower.includes('suggests:') ||
    lower.includes('implies:')
  );
}

export function reasonWordCount(reason: string): number {
  return String(reason)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/** Non-empty trimmed reason and at most MAX_EVIDENCE_REASON_WORDS words. */
export function reasonMeetsContract(reason: string | undefined): boolean {
  const t = typeof reason === 'string' ? reason.trim() : '';
  if (t.length === 0) return false;
  return reasonWordCount(t) <= MAX_EVIDENCE_REASON_WORDS;
}

export function quoteIsExactSubstringOf(quote: string, originalText: string): boolean {
  const q = quote.trim();
  if (q.length === 0) return false;
  return originalText.includes(q);
}

function evidenceQuoteIsValid(quote: string, originalText: string): boolean {
  if (quoteContainsBannedMarkers(quote)) return false;
  return quoteIsExactSubstringOf(quote, originalText);
}

function evidenceItemIsFullyValid(
  e: ExtractionEvidenceItem,
  originalText: string,
): boolean {
  return (
    evidenceQuoteIsValid(e.quote, originalText) &&
    reasonMeetsContract(e.reason)
  );
}

function hasValidMatchingEvidence(
  signalKey: string,
  evidence: ExtractionEvidenceItem[],
  originalText: string,
): boolean {
  return evidence.some(
    (e) =>
      officializeEvidenceSignal(e.signal) === signalKey &&
      evidenceItemIsFullyValid(e, originalText),
  );
}

function recomputeConfidence(
  domain: ExtractionDomain,
  nonNullInDomain: number,
  previous: number,
): number {
  const total = allowedSignalKeyCountForDomain(domain);
  let confidence = typeof previous === 'number' && Number.isFinite(previous) ? previous : 0;
  if (nonNullInDomain < 3) {
    confidence = Math.min(confidence, 0.3);
  } else {
    confidence = total > 0 ? nonNullInDomain / total : 0;
  }
  return confidence;
}

/**
 * Drop invalid non-null signals and orphan evidence; recompute confidence from grounded coverage.
 * 
 * Validation rules:
 * - Null signals outside domain allowlist
 * - Null signals lacking valid evidence (exact quote + reason ≤8 words)
 * - Drop evidence rows that fail quote/reason checks
 * - Recompute confidence from final non-null count
 * - Quality gate: if non-null count < 1 (self) or < 2 (other domains) after evidence checks, null all signals and set domainStatus LOW_DATA
 * - Whitespace-only input: all null, domainStatus UNRELIABLE
 * 
 * Authority: can null, never invents or infers.
 */
export function validateExtraction(
  originalText: string,
  extraction: ExtractedSignals,
): ExtractedSignals {
  const domain = extraction.domain;
  const allowed = DOMAIN_ALLOWED_SIGNAL_KEYS[domain];
  const allowedSet = new Set<string>(allowed);

  if (!originalText.trim()) {
    const signalsEmpty: Record<string, number | null> = {};
    for (const key of EXTRACTION_SIGNAL_KEYS) {
      signalsEmpty[key] = null;
    }
    return {
      ...extraction,
      signals: signalsEmpty,
      evidence: [],
      confidence: 0,
      domainStatus: 'UNRELIABLE',
    };
  }

  const signals: Record<string, number | null> = { ...extraction.signals };

  for (const key of EXTRACTION_SIGNAL_KEYS) {
    if (!allowedSet.has(key)) {
      signals[key] = null;
    }
  }

  const normalizedEvidence: ExtractionEvidenceItem[] = (extraction.evidence ?? []).map((e) => ({
    ...e,
    signal: officializeEvidenceSignal(e.signal),
  }));

  for (const key of allowed) {
    if (signals[key] == null) continue;
    if (!hasValidMatchingEvidence(key, normalizedEvidence, originalText)) {
      signals[key] = null;
    }
  }

  let evidence = normalizedEvidence.filter(
    (e) =>
      allowedSet.has(e.signal) &&
      signals[e.signal] != null &&
      evidenceItemIsFullyValid(e, originalText),
  );
  evidence = evidence.slice(0, MAX_EVIDENCE_ITEMS);

  const nonNullInDomain = allowed.filter((k) => signals[k] != null).length;
  let confidence = recomputeConfidence(domain, nonNullInDomain, extraction.confidence);

  // Quality gate: reject truly empty extractions while preserving sparse-but-grounded outputs.
  // A single validated signal with exact evidence is now sufficient in every domain.
  const qualityFloor = 1;
  if (nonNullInDomain < qualityFloor) {
    for (const key of EXTRACTION_SIGNAL_KEYS) {
      signals[key] = null;
    }
    evidence = [];
    confidence = 0;
    return {
      ...extraction,
      signals,
      evidence,
      confidence,
      domainStatus: 'LOW_DATA',
    };
  }

  return {
    ...extraction,
    signals,
    evidence,
    confidence,
    domainStatus: 'OK',
  };
}
