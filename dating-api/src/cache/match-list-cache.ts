/** Cursor / cache helpers for ranked match list pagination (no Nest imports). */

export const MATCH_LIST_CACHE_TTL_SECONDS = 3600;
export const MATCH_LIST_CACHE_VERSION = 3 as const;

export function matchListCacheKey(userId: string): string {
  return `match:list:${userId}`;
}

/** Thrash guard for list_empty enqueue (Sprint 31 Story 4). */
export function matchListListEmptyEnqueueKey(userId: string): string {
  return `match:rank:list-empty-enq:${userId}`;
}

export const MATCH_LIST_LIST_EMPTY_ENQUEUE_TTL_SECONDS = 120;

export function profileEvalCacheKey(profileId: string): string {
  return `profile:eval:${profileId}`;
}

export type MatchListCursorPayload = {
  /** 0 = eligible bucket, 1 = hard-blocked bucket */
  b: 0 | 1;
  /** Last item matchScore (null encoded as -1) */
  s: number;
  /** Last item UserProfile.id */
  id: string;
};

/** Minimal fields needed for cursor pagination (full DTO stored in Redis as JSON). */
export type RankedMatchForCursor = {
  id: string;
  matchScore: number | null;
  hardBlocked?: unknown;
};

export type MatchListCachePayload<TMatch extends RankedMatchForCursor = RankedMatchForCursor> = {
  version: typeof MATCH_LIST_CACHE_VERSION;
  builtAt: string;
  statusMeta: Record<string, unknown>;
  matches: TMatch[];
};

export function encodeMatchListCursor(cursor: MatchListCursorPayload): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeMatchListCursor(raw: string): MatchListCursorPayload | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, 'base64url').toString('utf8'),
    ) as Partial<MatchListCursorPayload>;
    if (
      (parsed.b !== 0 && parsed.b !== 1) ||
      typeof parsed.s !== 'number' ||
      typeof parsed.id !== 'string' ||
      !parsed.id
    ) {
      return null;
    }
    return { b: parsed.b, s: parsed.s, id: parsed.id };
  } catch {
    return null;
  }
}

export function matchListCursorFromItem(item: RankedMatchForCursor): MatchListCursorPayload {
  return {
    b: item.hardBlocked ? 1 : 0,
    s: item.matchScore ?? -1,
    id: item.id,
  };
}

export function isAfterMatchListCursor(
  item: RankedMatchForCursor,
  cursor: MatchListCursorPayload,
): boolean {
  const itemCursor = matchListCursorFromItem(item);
  if (itemCursor.b !== cursor.b) return itemCursor.b > cursor.b;
  if (itemCursor.s !== cursor.s) return itemCursor.s < cursor.s;
  return itemCursor.id > cursor.id;
}

export function paginateRankedMatches<T extends RankedMatchForCursor>(
  matches: T[],
  cursor: MatchListCursorPayload | null,
  limit: number,
): { page: T[]; nextCursor: string | null; hasMore: boolean } {
  let start = 0;
  if (cursor) {
    start = matches.findIndex((m) => isAfterMatchListCursor(m, cursor));
    if (start < 0) {
      return { page: [], nextCursor: null, hasMore: false };
    }
  }
  const page = matches.slice(start, start + limit);
  const hasMore = start + limit < matches.length;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last ? encodeMatchListCursor(matchListCursorFromItem(last)) : null;
  return { page, nextCursor, hasMore };
}
