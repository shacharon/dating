/**
 * Env name `ENABLE_HG_LIST_ADMISSION_GATE`. When enabled (`1` / `true` / `yes`, case-insensitive), `MatchesService.list`
 * and `listFullWithHolyGrailRows` apply a **lenient** membership filter: rows **without** a valid HG diagnostic triple
 * (`hgMutualPass` / `hgOverallStatus` / `hgRankScore` per `tryPickHolyGrailMatchDiagnosticsDto`) are **not** removed.
 * Rows **with** a valid triple are kept only when `hgMutualPass === true`. See `hg-list-admission-gate.ts`.
 */
export const ENABLE_HG_LIST_ADMISSION_GATE_ENV = 'ENABLE_HG_LIST_ADMISSION_GATE';
