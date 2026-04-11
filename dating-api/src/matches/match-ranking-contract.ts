/**
 * ## Production match ranking contract (`MATCH_RANKING_CONTRACT`)
 *
 * **Model: HG gate-only + legacy rank (`HG_GATE_LEGACY_RANK_V1`)**
 *
 * - **Holy Grail is not a ranking signal** in production list/top surfaces: `hgMutualPass`, `hgOverallStatus`,
 *   and `hgRankScore` are read-only diagnostics for UI and audits. Sort keys use legacy engine scores only.
 * - **HG-adjacent admission (optional, explicit):** `GET /api/v1/matches?hideChildrenUnsure=1` removes pairs where
 *   HG-resolved `children_unsure` is true in either direction. This is a **client-requested response filter**, not
 *   automatic exclusion of all HG-hard-FAIL pairs from the legacy-ready set.
 * - **HG mutual-pass list gate (optional, env):** `ENABLE_HG_LIST_ADMISSION_GATE=1` removes pairs that do not have a
 *   valid HG wire with `hgMutualPass === true` from `MatchesService.list` / `listFullWithHolyGrailRows` **before**
 *   `hideChildrenUnsure` and final legacy sort. Invalid/missing HG wire → **kept** (lenient fallback). Ranking keys
 *   stay legacy per this contract until a separate HG-rank mode ships.
 * - **No mixed ranking:** List `rankingScore` equals `engineFinalScore` (same numeric value as legacy `finalScore`
 *   for that row). HG `children_unsure` does **not** apply a multiplicative score penalty to ordering.
 *
 * **Not chosen:** `HG_GATE_HG_RANK` (gate-plus-ranking) — would require a total order on HG dimensions and
 * demoting legacy `finalScore` to secondary explainability; out of scope until product specifies HG sort keys.
 */

export const MATCH_RANKING_CONTRACT = 'HG_GATE_LEGACY_RANK_V1' as const;

export type MatchRankingContractId = typeof MATCH_RANKING_CONTRACT;
