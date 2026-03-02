export type ExtractionDomain = 'self' | 'partner' | 'relationship';

/** Official signal keys only. Legacy/alias keys are mapped before validation; unknown keys are dropped. */
export const EXTRACTION_SIGNAL_KEYS = [
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

export type ExtractionSignalKey = (typeof EXTRACTION_SIGNAL_KEYS)[number];

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
  /** Set when extraction is empty and input had content; for debugging. */
  debug?: { rawModelOutput: string };
}
