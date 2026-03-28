export type ExtractionDomain = 'self' | 'partner' | 'relationship';

/** Per-domain extraction quality for API/UI; orthogonal to numeric confidence after quality gate. */
export type ExtractionDomainQualityStatus = 'OK' | 'LOW_DATA' | 'UNRELIABLE';

export interface LLMUsageStats {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUSD: number;
  durationMs: number;
}

/** Official signal keys only. Legacy/alias keys are mapped before validation; unknown keys are dropped. */
export const OFFICIAL_EXTRACTION_SIGNAL_KEYS = [
  'ambition',
  'socialBattery',
  'healthBodyConsciousness',
  'emotionalDepth',
  'attachmentSecurity',
  'directness',
  'independence',
  'traditionalism',
  'financialMindset',
  'relationshipClarity',
  'spirituality',
  'lifestylePace',
  'physicalPriority',
  'statusOrientation',
] as const;

/** Shadow signals: extracted and stored but NOT wired into compatibility, friction, or finalScore. */
export const SHADOW_SIGNAL_KEYS = [
  'intellectualCuriosity',
  'conflictStyle',
  'noveltyVsRoutine',
  'structureChaosTolerance',
] as const;

/** Set of shadow keys for O(1) lookup (e.g. never drop these in signal-count cap). */
export const SHADOW_SIGNAL_KEYS_SET = new Set<string>(SHADOW_SIGNAL_KEYS);

export const EXTRACTION_SIGNAL_KEYS = [
  ...OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  ...SHADOW_SIGNAL_KEYS,
] as const;

export type ExtractionSignalKey = (typeof EXTRACTION_SIGNAL_KEYS)[number];

/** Set of official signal keys for O(1) allowlist lookups. */
export const EXTRACTION_SIGNAL_KEYS_SET = new Set<string>(
  EXTRACTION_SIGNAL_KEYS,
);

/** Max number of evidence items kept in extraction output. Allows room for 14 official + 4 shadow. */
export const MAX_EVIDENCE_ITEMS = 22;

/** Count of non-null values in a signals record. Same as Object.values(signals).filter((v) => v != null).length. */
export function countNonNullSignals(
  signals: Record<string, number | null>,
): number {
  return Object.values(signals).filter((v) => v != null).length;
}

export interface ExtractionEvidenceItem {
  signal: string;
  quote: string;
  /** Max 8 words; required for a signal to be considered grounded. */
  reason: string;
  note?: string;
}

export interface ExtractedSignals {
  domain: ExtractionDomain;
  /** Scores 1–10 or null; keys are EXTRACTION_SIGNAL_KEYS. */
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  version: 'v1';
  confidence: number;
  /**
   * Set by validateExtraction / extract pipeline. OK = passed quality floor; LOW_DATA = insufficient
   * grounded signals; UNRELIABLE = unusable input or empty-model path (see notes).
   */
  domainStatus?: ExtractionDomainQualityStatus;
  notes?: string;
  /** Tracks which signals were filled by post-LLM text-inference rules. */
  coverageNotes?: string[];
  /** Set when extraction is empty and input had content; for debugging. */
  debug?: { rawModelOutput: string };
  /** Token usage and cost metadata from the LLM call(s). */
  _usage?: LLMUsageStats;
  /** Internal: which pipeline stages contributed (debugging only). */
  _provenance?: { stages: string[] };
}

/**
 * Effective status for display when reading legacy payloads without `domainStatus`.
 * Does not infer UNRELIABLE (requires explicit marker from pipeline).
 */
export function effectiveDomainQualityStatus(
  s: ExtractedSignals,
): ExtractionDomainQualityStatus {
  if (s.domainStatus) return s.domainStatus;
  return countNonNullSignals(s.signals) >= 2 ? 'OK' : 'LOW_DATA';
}
