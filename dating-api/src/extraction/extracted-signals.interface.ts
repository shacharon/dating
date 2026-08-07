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
  'conflictStyle',
] as const;

/** Shadow signals: extracted and stored but NOT wired into compatibility, friction, or finalScore. */
export const SHADOW_SIGNAL_KEYS = [
  /** Expansion-04 — Intellectual & Creative (already shadow; Story 2 refines relationship-need framing). */
  'intellectualCuriosity',
  /**
   * Expansion-06 — Adventure & Novelty (shadow until Phase 2 promote).
   * Formerly `noveltyVsRoutine` (legacy alias maps into this key).
   * Novelty-seeking vs familiar/routine preference — NOT lifestylePace (tempo)
   * and NOT domesticComfort (home vs out) or travel interest tags (binary).
   */
  'adventureNovelty',
  'structureChaosTolerance',
  /** Phase A expansion — not yet wired to chips, traits, or scoring. */
  'emotionalAvailability',
  'emotionalSafety',
  'commitmentIntentDepth',
  'practicalLifeReadiness',
  /** Expansion-01 — Empathy & Vulnerability (shadow until Phase 1 promote). */
  'empathyCompassion',
  'vulnerabilityOpenness',
  /** Expansion-02 — Emotional Regulation & Physical Affection (shadow until Phase 1 promote). */
  'emotionalRegulation',
  'physicalAffectionStyle',
  /** Expansion-03 — Humor & Playfulness (shadow until Phase 1 promote). */
  'humorPlayfulness',
  /** Expansion-04 — Intellectual & Creative Expression (shadow until Phase 2 promote). */
  'creativeExpression',
  /**
   * Expansion-05 — Physical Activity & Domestic Comfort (shadow until Phase 2 promote).
   * physicalActivityLevel: daily athletic/activity behavior — NOT healthBodyConsciousness (wellness values)
   *   and NOT physicalPriority (looks importance).
   * domesticComfort: homebody vs always-out preference — NOT socialBattery (intro/extro energy)
   *   and NOT lifestylePace (busy vs calm rhythm).
   */
  'physicalActivityLevel',
  'domesticComfort',
  /**
   * Expansion-07 — Profile Gap Signals (shadow until promote).
   * casualIntimacyIntent: casual/hookup vs committed-only intimacy — NOT physicalPriority / relationshipClarity alone.
   * supportExchangeOrientation: arrangement/money-in-relationship openness — NOT financialMindset.
   * supportProviderOrientation / supportRecipientOrientation: give vs receive direction — NOT exchange alone.
   * religiousObservance: practical practice (kosher/Shabbat/etc.) — NOT spirituality / traditionalism alone.
   */
  'casualIntimacyIntent',
  'supportExchangeOrientation',
  'supportProviderOrientation',
  'supportRecipientOrientation',
  'religiousObservance',
  /**
   * Expansion-08 — Education, Integrity, Chronotype & Physical Type (shadow until promote).
   * educationLevel: formal education/degree importance — NOT intellectualCuriosity / ambition alone.
   * honestyIntegrity: honesty/integrity/no-games value — NOT directness (bluntness) alone.
   * chronotype: morning↔night sleep/energy rhythm — NOT lifestylePace (tempo).
   * physicalTypePreference: specificity of body/build preference — NOT physicalPriority (looks importance).
   * Ethical: race/ethnicity and sexual-anatomy preferences are NEVER scored keys.
   */
  'educationLevel',
  'honestyIntegrity',
  'chronotype',
  'physicalTypePreference',
  /**
   * Expansion-10 — Conflict Recovery (shadow until promote).
   * repairSkills: post-conflict apology / ownership / reconnection — NOT conflictStyle (during conflict).
   * forgivenessStyle: letting go vs holding grudges after conflict — NOT attachmentSecurity / emotionalRegulation alone.
   */
  'repairSkills',
  'forgivenessStyle',
  /**
   * Expansion-11 — Stress & Security (shadow until promote).
   * stressResponse: pursue vs withdraw under stress — NOT attachmentSecurity / emotionalRegulation alone.
   * jealousySecurity: jealousy/possessiveness vs trust (high = more jealous) — NOT independence / attachmentSecurity alone.
   */
  'stressResponse',
  'jealousySecurity',
  /**
   * Expansion-12 — Feeling Heard (shadow until promote).
   * listeningPresence: attention/presence when partner speaks — NOT empathyCompassion / directness alone.
   * emotionalExpression: outward verbal/emotional expression — NOT emotionalDepth / physicalAffectionStyle alone.
   */
  'listeningPresence',
  'emotionalExpression',
  /**
   * Expansion-13 — Growth & Self-Awareness (shadow until promote).
   * growthMindset: openness to feedback/change — NOT vulnerabilityOpenness / directness alone.
   * selfAwareness: insight into own patterns/triggers — NOT emotionalRegulation / empathyCompassion alone.
   */
  'growthMindset',
  'selfAwareness',
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

/** Max number of evidence items kept in extraction output. Allows room for 15 official + 32 shadow + 4 buffer. */
export const MAX_EVIDENCE_ITEMS = 51;

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

/** Snapshot for pipeline diffing (observability). */
export interface ExtractionSnapshot {
  domain: ExtractionDomain;
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  confidence: number;
}

export interface ExtractionStageDiff {
  fromStage: string;
  toStage: string;
  signalKeysWithChangedValues: string[];
  nonNullSignalsBefore: number;
  nonNullSignalsAfter: number;
  evidenceCountBefore: number;
  evidenceCountAfter: number;
  confidenceBefore: number;
  confidenceAfter: number;
}

export interface ExtractionPipelineTrace {
  pipeline: 'extraction_v1' | 'extraction_v2_base';
  domain: ExtractionDomain;
  requestId: string;
  profileId?: string;
  rawLlmOutput: {
    parsedJson: unknown;
    rawTextPreview: string;
    rawTextCharLength: number;
  };
  stageDiffs: ExtractionStageDiff[];
}

export interface ExtractedSignals {
  domain: ExtractionDomain;
  /** Scores 1–10 or null; keys are EXTRACTION_SIGNAL_KEYS. */
  signals: Record<string, number | null>;
  /** JSON-first topic extraction for UI/debug only (no scoring impact). */
  rawInterests?: string[];
  /** JSON-first negatives extraction for UI/debug only (no scoring impact). */
  negativePreferences?: string[];
  softNo?: string[];
  dealbreakers?: string[];
  evidence: ExtractionEvidenceItem[];
  version: 'v1';
  confidence: number;
  /** Optional domain quality hint from callers or legacy payloads (not set by strict validation). */
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
  /** Raw LLM payload + per-stage signal/evidence diffs (observability; does not affect scores). */
  _pipelineTrace?: ExtractionPipelineTrace;
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
