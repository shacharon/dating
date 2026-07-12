/**
 * Kids / family semantics — explicit ownership (no shared implementation with Holy Grail).
 *
 * **Admission (hard gate on structured prefs vs facts)** — owner: `holy-grail-matching/eligibility.evaluator.ts`
 * - Dimensions: `PARTNER_HAS_CHILDREN`, `PARTNER_WANTS_CHILDREN` (plus unrelated HG dimensions).
 * - `overallHardEligibility === 'FAIL'` iff any evaluated dimension has status `FAIL`.
 * - `SOFT_PASS` on `PARTNER_WANTS_CHILDREN` (MUST_WANT × partner UNSURE) does **not** fail overall; it only
 *   feeds the directional `children_unsure` product flag (badges / optional list filter — not list sort; see `match-ranking-contract.ts`).
 * - Unknown / withheld counterparty facts for active prefs → `FAIL` on that dimension (deterministic).
 *
 * **List UX (optional hide, no HG-in-sort)** — owner: `matches/children-unsure.*` + `matches/match-ranking-contract.ts`
 * - HG-evaluated `children_unsure` drives badges and optional `hideChildrenUnsure` list filter only.
 * - Production list **order** uses legacy `finalScore` / `rankingScore` (identical under the ranking contract).
 *
 * **Legacy engine score (V1 self signals + derived context)** — owner: `domain/dealbreakers.ts` + match engine
 * - Dealbreaker `RELATIONSHIP_CLARITY_MISMATCH_CODE` uses **only** `relationshipClarity` gaps on both sides.
 * - It is **not** Holy Grail structured children state; extraction guidance maps explicit “wants kids” language
 *   primarily to other signals — this rule is a coarse compatibility / clarity stress signal for scoring only.
 */

/**
 * Wire code emitted by `computeDealbreakers` for the relationshipClarity-only rule (legacy engine).
 * Historical rows may still carry `KIDS_TIMELINE_MISMATCH`; `match-short-reason` maps that code for display parity.
 */
export const RELATIONSHIP_CLARITY_MISMATCH_CODE =
  'RELATIONSHIP_CLARITY_MISMATCH' as const;
