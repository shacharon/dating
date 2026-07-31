/** Shared profile evaluation / chip types for internal profile tools. */

export interface ExtractionEvidenceItem {
  signal: string;
  quote: string;
  reason?: string;
}

export type ExtractionDomainQualityStatus = 'OK' | 'LOW_DATA' | 'UNRELIABLE';

export interface ExtractedSignals {
  domain: string;
  signals: Record<string, number | null>;
  evidence: ExtractionEvidenceItem[];
  confidence: number;
  domainStatus?: ExtractionDomainQualityStatus;
}

export type ProductScorePresentationValue =
  | { kind: 'numeric'; value: number }
  | { kind: 'insufficient_data' };

export interface ProductScores {
  partnerFitScore: number;
  relationshipFitScore: number;
  coverageScore: number;
  frictionRiskScore: number;
  overallDecisionScore: number;
}

export interface ProductScoresPresentation {
  partnerFitScore: ProductScorePresentationValue;
  relationshipFitScore: ProductScorePresentationValue;
  coverageScore: ProductScorePresentationValue;
  frictionRiskScore: ProductScorePresentationValue;
  overallDecisionScore: ProductScorePresentationValue;
}

export interface EnrichmentSignalsV1 {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  interestsTop3: string[];
}

export interface EnrichmentV1 {
  version: 'v1';
  signals: EnrichmentSignalsV1;
}

export interface EvaluationChip {
  label: string;
  source: 'interest' | 'motivation' | 'trait' | 'signal' | 'enrichment';
}

export type ChipDomain = 'self' | 'partner' | 'relationship';

export interface DisplayChip extends EvaluationChip {
  label: string;
  hint: string;
}

export interface ChipsBundle {
  self: EvaluationChip[];
  partner: EvaluationChip[];
  relationship: EvaluationChip[];
}

export interface Evaluation {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  display: { summary: string; insight: string; note?: string };
  productScores: ProductScores;
  productScoresPresentation?: ProductScoresPresentation;
  flags: string[];
  chips?: ChipsBundle;
  enrichment?: EnrichmentV1;
}

export type SignalTab = 'self' | 'partner' | 'relationship';

export interface ProfileTexts {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}
