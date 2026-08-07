/**
 * Evidence integrity validation after LLM extraction.
 * Filters evidence rows that fail format/substring/reason contracts.
 * Does not null signals for missing or invalid evidence (LLM-first).
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
export const DOMAIN_ALLOWED_SIGNAL_KEYS: Record<
  ExtractionDomain,
  readonly string[]
> = {
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
    'adventureNovelty',
    'structureChaosTolerance',
    'relationshipClarity',
    'empathyCompassion',
    'vulnerabilityOpenness',
    'emotionalRegulation',
    'physicalAffectionStyle',
    'humorPlayfulness',
    'creativeExpression',
    'physicalActivityLevel',
    'domesticComfort',
    'casualIntimacyIntent',
    'supportExchangeOrientation',
    'supportProviderOrientation',
    'supportRecipientOrientation',
    'religiousObservance',
    'educationLevel',
    'honestyIntegrity',
    'chronotype',
    'physicalTypePreference',
    'repairSkills',
    'forgivenessStyle',
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
    'casualIntimacyIntent',
    'supportExchangeOrientation',
    'supportProviderOrientation',
    'supportRecipientOrientation',
    'religiousObservance',
    'educationLevel',
    'honestyIntegrity',
    'chronotype',
    'physicalTypePreference',
    'repairSkills',
    'forgivenessStyle',
  ],
};

export function allowedSignalKeyCountForDomain(
  domain: ExtractionDomain,
): number {
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
  return String(reason).trim().split(/\s+/).filter(Boolean).length;
}

/** Non-empty trimmed reason and at most MAX_EVIDENCE_REASON_WORDS words. */
export function reasonMeetsContract(reason: string | undefined): boolean {
  const t = typeof reason === 'string' ? reason.trim() : '';
  if (t.length === 0) return false;
  return reasonWordCount(t) <= MAX_EVIDENCE_REASON_WORDS;
}

export function quoteIsExactSubstringOf(
  quote: string,
  originalText: string,
): boolean {
  const q = quote.trim();
  if (q.length === 0) return false;
  return originalText.includes(q);
}

function evidenceQuoteIsValid(quote: string, originalText: string): boolean {
  if (quoteContainsBannedMarkers(quote)) return false;
  return quoteIsExactSubstringOf(quote, originalText);
}

export function evidenceItemIsFullyValid(
  e: ExtractionEvidenceItem,
  originalText: string,
): boolean {
  return (
    evidenceQuoteIsValid(e.quote, originalText) && reasonMeetsContract(e.reason)
  );
}

function countNonNullInAllowed(
  signals: Record<string, number | null>,
  allowed: readonly string[],
): number {
  return allowed.filter((k) => signals[k] != null).length;
}

export type ValidateExtractionDebugLog = (
  payload: Record<string, unknown>,
) => void;

/**
 * Evidence-only validation: drop evidence rows that fail integrity checks.
 * Technical: null signals for keys outside this domain's allowlist (wrong slot).
 * Preserves LLM signal values even when no valid evidence row remains.
 */
export function validateExtraction(
  originalText: string,
  extraction: ExtractedSignals,
  debugLog?: ValidateExtractionDebugLog,
): ExtractedSignals {
  const domain = extraction.domain;
  const allowed = DOMAIN_ALLOWED_SIGNAL_KEYS[domain];
  const allowedSet = new Set<string>(allowed);

  const signals: Record<string, number | null> = { ...extraction.signals };

  const nonNullSignalsBefore = countNonNullInAllowed(signals, allowed);
  const evidenceRowsBefore = (extraction.evidence ?? []).length;

  let misplacedDomainSignalsCleared = 0;
  for (const key of EXTRACTION_SIGNAL_KEYS) {
    if (!allowedSet.has(key) && signals[key] != null) {
      misplacedDomainSignalsCleared += 1;
      signals[key] = null;
    }
  }

  const normalizedEvidence: ExtractionEvidenceItem[] = (
    extraction.evidence ?? []
  ).map((e) => ({
    ...e,
    signal: officializeEvidenceSignal(e.signal),
  }));

  let evidence = normalizedEvidence.filter(
    (e) =>
      allowedSet.has(e.signal) && evidenceItemIsFullyValid(e, originalText),
  );
  evidence = evidence.slice(0, MAX_EVIDENCE_ITEMS);

  const nonNullSignalsAfter = countNonNullInAllowed(signals, allowed);
  const droppedEvidenceRows = evidenceRowsBefore - evidence.length;

  debugLog?.({
    event: 'validateExtraction',
    domain,
    before: {
      nonNullSignalsInDomain: nonNullSignalsBefore,
      evidenceRows: evidenceRowsBefore,
    },
    after: {
      nonNullSignalsInDomain: nonNullSignalsAfter,
      evidenceRows: evidence.length,
    },
    /** Wrong-domain keys nulled (schema); LLM scores for this domain are unchanged. */
    misplacedDomainSignalsCleared,
    droppedEvidenceRows,
    /** Always 0: signals are not nulled for evidence failures. */
    signalsDroppedForEvidenceMismatch: 0,
  });

  return {
    ...extraction,
    signals,
    evidence,
    confidence: extraction.confidence,
  };
}
