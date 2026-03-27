/**
 * Product domain types for UI scores (0–100) from the dating comparison system.
 * No framework decorators.
 */

/** Product/UI scores for calibration and testing. All scores 0–100. */
export interface ProductScores {
  partnerFitScore: number;
  relationshipFitScore: number;
  coverageScore: number;
  frictionRiskScore: number;
  overallDecisionScore: number;
  policyVersion: 'product-score-v1';
  debug?: {
    totalHardMismatches: number;
    avgConfidence: number;
    totalNonNullSignals: number;
  };
}
