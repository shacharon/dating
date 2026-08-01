/**
 * Sprint 31 Story 4 — flagged MatchListRank list read path.
 * Env: MATCH_LIST_MATERIALIZED. On when 1/true/yes (case-insensitive). Default off.
 */
export const MATCH_LIST_MATERIALIZED_ENV = 'MATCH_LIST_MATERIALIZED';

export function isMatchListMaterializedEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[MATCH_LIST_MATERIALIZED_ENV];
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
