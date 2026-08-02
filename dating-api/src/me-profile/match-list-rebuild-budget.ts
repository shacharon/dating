/**
 * Soft wall-clock budget for MatchListRank rebuild scoring (Sprint 39 Story 2).
 * Env: MATCH_LIST_REBUILD_BUDGET_MS. Default 10000; unset / non-finite / &lt; 1 → 10000.
 */
export const MATCH_LIST_REBUILD_BUDGET_MS_ENV = 'MATCH_LIST_REBUILD_BUDGET_MS';
export const MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT = 10_000;

export function resolveMatchListRebuildBudgetMs(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[MATCH_LIST_REBUILD_BUDGET_MS_ENV];
  if (raw == null || String(raw).trim() === '') {
    return MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT;
  }
  return Math.floor(n);
}
