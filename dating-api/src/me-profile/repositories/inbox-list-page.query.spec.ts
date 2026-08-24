import {
  isAfterConversationListCursor,
  paginateConversationList,
} from '../conversations/me-conversations-list-cursor';
import {
  buildSortedInboxRows,
  inboxListPageSqlRows,
  paginateInboxFixtures,
  parseInboxListPageArgs,
} from './inbox-list-page.spec-support';
import {
  inboxListCursorWhereSql,
  queryInboxListPage,
} from './inbox-list-page.query';
import type { InboxListPageRow } from './conversation.repository.types';

describe('inbox-list-page.query', () => {
  const sessionUserId = 'user_viewer';
  const fixtures = [
    {
      id: 'c1',
      userId1: sessionUserId,
      userId2: 'u_a',
      matchedAt: new Date('2026-06-03T00:00:00.000Z'),
      unreadCount: 3,
    },
    {
      id: 'c2',
      userId1: sessionUserId,
      userId2: 'u_b',
      matchedAt: new Date('2026-06-02T00:00:00.000Z'),
      unreadCount: 1,
    },
    {
      id: 'c3',
      userId1: 'u_c',
      userId2: sessionUserId,
      matchedAt: new Date('2026-06-01T00:00:00.000Z'),
      unreadCount: 0,
    },
  ];

  describe('inboxListCursorWhereSql parity with isAfterConversationListCursor', () => {
    const sorted = buildSortedInboxRows(fixtures);

    it('includes row iff it sorts strictly after cursor', () => {
      const cursor = {
        unreadCount: 1,
        matchedAt: '2026-06-02T00:00:00.000Z',
        id: 'c2',
      };
      for (const row of sorted) {
        const item = {
          id: row.id,
          matchedAt: row.matchedAt.toISOString(),
          unreadCount: row.unreadCount,
        };
        const jsAfter = isAfterConversationListCursor(item, cursor);
        const sqlText = inboxListCursorWhereSql(cursor).strings.join(' ');
        expect(sqlText).toContain('"unreadCount"');
        expect(jsAfter).toBe(
          row.id === 'c3' ||
            (row.unreadCount === 1 &&
              row.matchedAt.toISOString() === cursor.matchedAt &&
              row.id > cursor.id),
        );
      }
    });

    it('paginateInboxFixtures matches paginateConversationList on same fixtures', () => {
      const items = sorted.map((row) => ({
        id: row.id,
        matchedAt: row.matchedAt.toISOString(),
        unreadCount: row.unreadCount,
      }));
      const page1Js = paginateConversationList(items, null, 2);
      const page1Sql = paginateInboxFixtures(fixtures, null, 2);
      expect(page1Sql.rows.map((r) => r.id)).toEqual(
        page1Js.page.map((i) => i.id),
      );
      expect(page1Sql.hasMore).toBe(page1Js.hasMore);

      const cursor = page1Js.nextCursor
        ? JSON.parse(
            Buffer.from(page1Js.nextCursor, 'base64url').toString('utf8'),
          )
        : null;
      const page2Js = paginateConversationList(items, cursor, 2);
      const page2Sql = paginateInboxFixtures(fixtures, cursor, 2);
      expect(page2Sql.rows.map((r) => r.id)).toEqual(
        page2Js.page.map((i) => i.id),
      );
      expect([...page1Sql.rows, ...page2Sql.rows].map((r) => r.id)).toEqual(
        sorted.map((r) => r.id),
      );
    });
  });

  describe('queryInboxListPage', () => {
    it('returns trimmed rows and hasMore when SQL returns limit+1', async () => {
      const queryRaw = jest.fn(async () =>
        inboxListPageSqlRows(fixtures, null, 2),
      );
      const result = await queryInboxListPage(
        { $queryRaw: queryRaw },
        { sessionUserId, cursor: null, limit: 2 },
      );
      expect(result.rows.map((r) => r.id)).toEqual(['c1', 'c2']);
      expect(result.hasMore).toBe(true);
      expect(queryRaw).toHaveBeenCalledTimes(1);
    });

    it('returns empty when cursor is past last row', async () => {
      const queryRaw = jest.fn(async () => []);
      const result = await queryInboxListPage(
        { $queryRaw: queryRaw },
        {
          sessionUserId,
          cursor: {
            unreadCount: 0,
            matchedAt: '2026-06-01T00:00:00.000Z',
            id: 'c3',
          },
          limit: 20,
        },
      );
      expect(result).toEqual({ rows: [], hasMore: false });
    });

    it('binds sessionUserId and limit+1 in SQL args', async () => {
      const queryRaw = jest.fn(async () => [] as InboxListPageRow[]);
      await queryInboxListPage(
        { $queryRaw: queryRaw },
        { sessionUserId, cursor: null, limit: 20 },
      );
      const sql = queryRaw.mock.calls[0]![0] as {
        strings: string[];
        values: unknown[];
      };
      expect(sql.values.filter((v) => v === sessionUserId).length).toBeGreaterThanOrEqual(5);
      expect(sql.values[sql.values.length - 1]).toBe(21);

      await queryInboxListPage(
        { $queryRaw: queryRaw },
        {
          sessionUserId,
          cursor: {
            unreadCount: 1,
            matchedAt: '2026-06-02T00:00:00.000Z',
            id: 'c2',
          },
          limit: 10,
        },
      );
      const sqlWithCursor = queryRaw.mock.calls[1]![0] as {
        strings: string[];
        values: unknown[];
      };
      const parsed = parseInboxListPageArgs(sqlWithCursor);
      expect(parsed.limit).toBe(10);
      expect(parsed.cursor).toEqual({
        unreadCount: 1,
        matchedAt: '2026-06-02T00:00:00.000Z',
        id: 'c2',
      });
      expect(sqlWithCursor.values[sqlWithCursor.values.length - 1]).toBe(11);
    });

    it('normalizes string dates from SQL driver', async () => {
      const queryRaw = jest.fn(async () => [
        {
          id: 'c1',
          userId1: sessionUserId,
          userId2: 'u_a',
          matchedAt: '2026-06-03T00:00:00.000Z',
          user1LastReadAt: null,
          user2LastReadAt: null,
          unreadCount: '2',
        },
      ]);
      const result = await queryInboxListPage(
        { $queryRaw: queryRaw },
        { sessionUserId, cursor: null, limit: 20 },
      );
      expect(result.rows[0]?.matchedAt).toBeInstanceOf(Date);
      expect(result.rows[0]?.unreadCount).toBe(2);
    });
  });
});
