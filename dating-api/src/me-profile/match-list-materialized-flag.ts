/**
 * Sprint 31 — MatchListRank list read path.
 * Env: MATCH_LIST_MATERIALIZED.
 * Default **on** (Story 5 cutover). Escape hatch: 0 / false / no → legacy Redis+rebuild.
 */
export const MATCH_LIST_MATERIALIZED_ENV = 'MATCH_LIST_MATERIALIZED';

const MATERIALIZED_OFF = new Set(['0', 'false', 'no']);

export function isMatchListMaterializedEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env[MATCH_LIST_MATERIALIZED_ENV];
  if (raw == null) return true;
  const v = String(raw).trim().toLowerCase();
  if (v === '') return true;
  return !MATERIALIZED_OFF.has(v);
}
