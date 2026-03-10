export type ExtractionDomain = 'self' | 'partner' | 'relationship';

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

/** Week 2 shadow signal: extracted and stored but NOT wired into compatibility, friction, or finalScore. Only intellectualCuriosity is active. */
export const SHADOW_SIGNAL_KEYS = ['intellectualCuriosity'] as const;

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

/** Max number of evidence items kept in extraction output. Allows room for 14 official + 1 shadow. */
export const MAX_EVIDENCE_ITEMS = 18;

/** Count of non-null values in a signals record. Same as Object.values(signals).filter((v) => v != null).length. */
export function countNonNullSignals(
  signals: Record<string, number | null>,
): number {
  return Object.values(signals).filter((v) => v != null).length;
}

export interface ExtractionEvidenceItem {
  signal: string;
  quote: string;
  note?: string;
}

export interface ExtractedSignals {
  domain: ExtractionDomain;
  /** Scores 1–10 or null; keys are EXTRACTION_SIGNAL_KEYS. */
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  version: 'v1';
  confidence: number;
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
