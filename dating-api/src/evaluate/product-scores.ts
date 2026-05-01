import type { CompatibilityResult } from '../compatibility/compatibility-score';
import type { ProductScores } from '../domain/scoring/product-scores.types';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import {
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  effectiveDomainQualityStatus,
} from '../extraction/extracted-signals.interface';

/** Threshold below which LOW_CONFIDENCE flag is set (matches evaluate.service honesty framing). */
const LOW_CONFIDENCE_THRESHOLD = 0.5;

/** Non-null official extraction keys only (excludes shadow / SIGNAL3 keys from coverage). */
function countMatchedOfficialSignals(
  signals: Record<string, number | null>,
): number {
  let n = 0;
  for (const key of OFFICIAL_EXTRACTION_SIGNAL_KEYS) {
    if (signals[key] != null) n += 1;
  }
  return n;
}

/** Product/UI flags for calibration and testing. */
export type EvaluateFlag =
  | 'LOW_COVERAGE'
  | 'LOW_CONFIDENCE'
  | 'HIGH_FRICTION_RISK';

/** UI-safe product score cell: numeric value or withheld (do not show as 0%). */
export type ProductScorePresentationValue =
  | { kind: 'numeric'; value: number }
  | { kind: 'insufficient_data' };

export interface ProductScoresPresentation {
  partnerFitScore: ProductScorePresentationValue;
  relationshipFitScore: ProductScorePresentationValue;
  coverageScore: ProductScorePresentationValue;
  frictionRiskScore: ProductScorePresentationValue;
  overallDecisionScore: ProductScorePresentationValue;
}

export function buildProductScoresPresentation(
  scores: ProductScores,
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
): ProductScoresPresentation {
  const sOk = effectiveDomainQualityStatus(self) === 'OK';
  const pOk = effectiveDomainQualityStatus(partner) === 'OK';
  const rOk = effectiveDomainQualityStatus(relationship) === 'OK';

  const num = (v: number): ProductScorePresentationValue => ({
    kind: 'numeric',
    value: Math.round(v),
  });
  const ins: ProductScorePresentationValue = { kind: 'insufficient_data' };

  return {
    partnerFitScore: sOk && pOk ? num(scores.partnerFitScore) : ins,
    relationshipFitScore: sOk && rOk ? num(scores.relationshipFitScore) : ins,
    coverageScore: sOk && pOk && rOk ? num(scores.coverageScore) : ins,
    frictionRiskScore: num(scores.frictionRiskScore),
    overallDecisionScore:
      sOk && pOk && rOk ? num(scores.overallDecisionScore) : ins,
  };
}

/** Deterministic product score bundle from compatibility + extraction. All scores 0–100. */
export function computeProductScores(
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
  selfVsPartner: CompatibilityResult,
  selfVsRelationship: CompatibilityResult,
): { productScores: ProductScores; flags: EvaluateFlag[] } {
  const partnerFitScore = Math.round(
    Math.max(0, Math.min(100, selfVsPartner.overallScore)),
  );
  const relationshipFitScore = Math.round(
    Math.max(0, Math.min(100, selfVsRelationship.overallScore)),
  );

  const totalKeys = 14 * 3;
  const matchedSignals =
    countMatchedOfficialSignals(self.signals) +
    countMatchedOfficialSignals(partner.signals) +
    countMatchedOfficialSignals(relationship.signals);
  const coveragePercentValue =
    totalKeys > 0 ? Math.round((100 * matchedSignals) / totalKeys) : 0;
  const coverageScore = Math.max(0, Math.min(100, coveragePercentValue));

  const totalHardMismatches =
    selfVsPartner.hardMismatches.length +
    selfVsRelationship.hardMismatches.length;
  const frictionRiskScore = Math.round(
    Math.max(0, Math.min(100, totalHardMismatches * 20)),
  );

  const avgConfidence =
    (self.confidence + partner.confidence + relationship.confidence) / 3;
  let overallDecisionScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (partnerFitScore +
          relationshipFitScore +
          coverageScore +
          (100 - frictionRiskScore)) /
          4,
      ),
    ),
  );

  /** v1 gating: low coverage cannot produce a misleadingly confident overall score. */
  if (coverageScore < 40) {
    overallDecisionScore = Math.min(overallDecisionScore, 49);
  } else if (coverageScore < 55) {
    overallDecisionScore = Math.min(overallDecisionScore, 64);
  }

  const productScores: ProductScores = {
    partnerFitScore,
    relationshipFitScore,
    coverageScore,
    frictionRiskScore,
    overallDecisionScore,
    policyVersion: 'product-score-v1',
    debug: {
      totalHardMismatches,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      totalNonNullSignals: matchedSignals,
    },
  };

  const flags: EvaluateFlag[] = [];
  if (coverageScore < 50 || matchedSignals < 6) flags.push('LOW_COVERAGE');
  if (avgConfidence < LOW_CONFIDENCE_THRESHOLD) flags.push('LOW_CONFIDENCE');
  if (frictionRiskScore >= 60) flags.push('HIGH_FRICTION_RISK');

  return { productScores, flags };
}
