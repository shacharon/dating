/**
 * Named knobs for the match-engine compare pipeline.
 * Values must stay identical to historical literals — extract-only, no retuning.
 */

/** Asymmetry: sparser profile present-signal count ≤ this AND fuller ≥ ASYMMETRY_MAX_PRESENT → scale directionals. */
export const ASYMMETRY_MIN_PRESENT = 6;

/** Asymmetry: fuller profile present-signal count ≥ this (paired with ASYMMETRY_MIN_PRESENT). */
export const ASYMMETRY_MAX_PRESENT = 9;

/** Multiplier applied to A→B / B→A when asymmetric signal coverage detected. */
export const ASYMMETRY_SCALE = 0.92;

/**
 * Cap on directional scores used as compatibility blend inputs (and finalScore hard clamp in compare()).
 * Same numeric gate as `Math.min(90, …)` on finalScore — one constant, two call sites.
 */
export const HARD_SCORE_CAP_90 = 90;

/** Coverage % at/below which low-evidence friction floor applies (with asymmetry / minPresent). */
export const LOW_EVIDENCE_COVERAGE_PERCENT = 55;

/** minPresent at/below which low-evidence friction floor applies. */
export const LOW_EVIDENCE_MIN_PRESENT = 5;

/** Minimum friction when low-evidence path triggers. */
export const LOW_EVIDENCE_FRICTION_FLOOR = 1;

/** Friction → frictionRisk display: risk = min(100, round(friction * this)). */
export const FRICTION_RISK_SCALE = 10;

/** Balance ratio below which relationshipFit is penalized / friction minimum elevated. */
export const BALANCE_RATIO_LOW = 2;

/** Balance ratio at/above which green-tier relationshipFit boost applies; also mid friction band upper bound. */
export const BALANCE_RATIO_MID = 4;

/** Friction minimum when balance.ratio < BALANCE_RATIO_LOW and baseFriction > 0. */
export const FRICTION_MIN_WHEN_BALANCE_LOW = 4;

/** Friction minimum when BALANCE_RATIO_LOW ≤ balance.ratio < BALANCE_RATIO_MID. */
export const FRICTION_MIN_WHEN_BALANCE_MID = 2;

/** relationshipFit bonus when balance.ratio ≥ BALANCE_RATIO_MID (green tier). */
export const RELATIONSHIP_FIT_GREEN_BOOST = 8;

/** relationshipFit penalty when balance.ratio < BALANCE_RATIO_LOW. */
export const RELATIONSHIP_FIT_LOW_BALANCE_PENALTY = 10;

/** Cap on valuesAlignment before it enters compatibility() blend. */
export const VALUES_ALIGNMENT_FOR_COMPAT_CAP = 85;

/**
 * When coverage ≤ LOW_EVIDENCE_COVERAGE_PERCENT, compatibility is min(compat, this + coveragePercent).
 * (Today: `50 + coveragePercentValue`.)
 */
export const COVERAGE_COMPAT_CEILING_BASE = 50;

/** Signal gap band for nuance penalty (inclusive). */
export const NUANCE_GAP_MIN = 3;
export const NUANCE_GAP_MAX = 5;

/** Flat compatibility penalty when clarity or pace gap in nuance band. */
export const NUANCE_PENALTY = 2;

/** Confidence upper bound when coveragePercent < this. */
export const VERY_LOW_COVERAGE_PERCENT = 25;

/** Confidence min() ceiling under very low coverage. */
export const VERY_LOW_COVERAGE_CONFIDENCE_CAP = 0.75;

/** Breakdown entries with pairScore ≥ this become alignment chips (top N). */
export const ALIGNMENT_CHIP_MIN_PAIR_SCORE = 8;

/** Max alignment / tension chips returned. */
export const EXPLAIN_CHIP_LIMIT = 3;

/** Edge boost: friction ≤ this AND compat in [EDGE_BOOST_COMPAT_MIN, EDGE_BOOST_COMPAT_MAX]. */
export const EDGE_BOOST_MAX_FRICTION = 1;
export const EDGE_BOOST_COMPAT_MIN = 70;
export const EDGE_BOOST_COMPAT_MAX = 75;
export const EDGE_BOOST_RAW_DELTA = 2;

/** MATCH_DEBUG log budget (first N matches only). */
export const MATCH_DEBUG_LOG_LIMIT = 50;
