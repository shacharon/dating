/**
 * MatchListRank persist batching (Sprint 40 Story 2).
 * Not scoring knobs — keep out of matching-algorithm.constants.ts.
 */

/** Rows per short interactive upsert transaction. */
export const MATCH_LIST_RANK_PERSIST_CHUNK = 100;

/** Prisma interactive txn options for each upsert chunk. */
export const MATCH_LIST_RANK_PERSIST_TX = {
  timeout: 20_000,
  maxWait: 10_000,
} as const;
