import {
  decodeMatchListCursor,
  encodeMatchListCursor,
  isAfterMatchListCursor,
  paginateRankedMatches,
  type RankedMatchForCursor,
} from './match-list-cache';

describe('match-list-cache pagination', () => {
  const items: RankedMatchForCursor[] = [
    { id: 'a', matchScore: 90 },
    { id: 'b', matchScore: 80 },
    { id: 'c', matchScore: 70 },
    { id: 'd', matchScore: 60, hardBlocked: { reasons: [] } },
    { id: 'e', matchScore: 50, hardBlocked: { reasons: [] } },
  ];

  it('encodes and decodes cursor round-trip', () => {
    const raw = encodeMatchListCursor({ b: 0, s: 80, id: 'b' });
    expect(decodeMatchListCursor(raw)).toEqual({ b: 0, s: 80, id: 'b' });
  });

  it('rejects invalid cursor', () => {
    expect(decodeMatchListCursor('not-valid')).toBeNull();
  });

  it('paginates first page with nextCursor', () => {
    const { page, nextCursor, hasMore } = paginateRankedMatches(items, null, 2);
    expect(page.map((m) => m.id)).toEqual(['a', 'b']);
    expect(hasMore).toBe(true);
    expect(nextCursor).toBeTruthy();
    const cursor = decodeMatchListCursor(nextCursor!);
    expect(cursor).toEqual({ b: 0, s: 80, id: 'b' });
  });

  it('paginates second page without duplicates or gaps', () => {
    const first = paginateRankedMatches(items, null, 2);
    const cursor = decodeMatchListCursor(first.nextCursor!);
    const second = paginateRankedMatches(items, cursor, 2);
    expect(second.page.map((m) => m.id)).toEqual(['c', 'd']);
    const all = [...first.page, ...second.page].map((m) => m.id);
    expect(new Set(all).size).toBe(all.length);
  });

  it('moves from eligible to hard-blocked bucket', () => {
    const afterC = { b: 0 as const, s: 70, id: 'c' };
    expect(isAfterMatchListCursor(items[3]!, afterC)).toBe(true);
    const page = paginateRankedMatches(items, afterC, 10);
    expect(page.page.map((m) => m.id)).toEqual(['d', 'e']);
    expect(page.hasMore).toBe(false);
    expect(page.nextCursor).toBeNull();
  });
});
