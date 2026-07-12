/**
 * Product knobs for children_unsure UX (not HG evaluator rules).
 * List **sorting** is legacy-only per `match-ranking-contract.ts`; optional `hideChildrenUnsure` filters responses.
 * HG hard admission on structured children lives in `holy-grail-matching/eligibility.evaluator.ts`;
 * legacy V1 dealbreakers on `relationshipClarity` live in `domain/dealbreakers.ts` — see `domain/kids-family-ownership.ts`.
 */

/** Placeholder until profile ages are exposed on list items. */
export const MATCH_PREVIEW_AGE_PLACEHOLDER = 30;

/** Positive chips shown on match preview cards. */
export const MATCH_PREVIEW_CHIPS_SLICE = 5;

/** Version string for persisted HG snapshot rows when populated by future jobs. */
export const HG_LIST_PRODUCT_POLICY_VERSION = 'hg_list_children_unsure_v1';
