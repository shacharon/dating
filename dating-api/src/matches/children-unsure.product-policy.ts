/**
 * Product knobs for children_unsure list/ranking and dating previews (not HG evaluator rules).
 */

/** Multiplicative ranking penalty when HG children_unsure applies (~4%, within 3–5% band). */
export const CHILDREN_UNSURE_RANKING_PENALTY_RATE = 0.04;

/** Max rows returned by GET /api/v1/matches/top. */
export const MATCH_TOP_PREVIEW_LIMIT = 20;

/** Placeholder until profile ages are exposed on list items. */
export const MATCH_PREVIEW_AGE_PLACEHOLDER = 30;

/** Positive chips shown on match preview cards. */
export const MATCH_PREVIEW_CHIPS_SLICE = 5;

/** Version string for persisted HG snapshot rows when populated by future jobs. */
export const HG_LIST_PRODUCT_POLICY_VERSION = 'hg_list_children_unsure_v1';
