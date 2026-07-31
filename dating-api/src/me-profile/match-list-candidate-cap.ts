/**
 * Match-list hydrate cap (Sprint 27 Story 4) — temporary until async materialization.
 * Env: MATCH_LIST_CANDIDATE_CAP. Default 1000; unset / non-finite / &lt; 1 (incl. 0) → 1000.
 */
export const MATCH_LIST_CANDIDATE_CAP_ENV = 'MATCH_LIST_CANDIDATE_CAP';
export const MATCH_LIST_CANDIDATE_CAP_DEFAULT = 1000;

export function resolveMatchListCandidateCap(
  env: NodeJS.ProcessEnv = process.env,
): number {
  const raw = env[MATCH_LIST_CANDIDATE_CAP_ENV];
  if (raw == null || String(raw).trim() === '') {
    return MATCH_LIST_CANDIDATE_CAP_DEFAULT;
  }
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) {
    return MATCH_LIST_CANDIDATE_CAP_DEFAULT;
  }
  return Math.floor(n);
}

/** Prisma orderBy for capped list hydrate (analyzedAt DESC NULLS LAST, id ASC). */
export const MATCH_LIST_CANDIDATE_HYDRATE_ORDER_BY = [
  { analyzedAt: { sort: 'desc' as const, nulls: 'last' as const } },
  { id: 'asc' as const },
];
