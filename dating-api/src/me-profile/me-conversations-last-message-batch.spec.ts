import { batchLastMessagesByConversationId } from './repositories/prisma-conversation.repository';

describe('batchLastMessagesByConversationId', () => {
  it('returns empty map for empty ids without querying', async () => {
    const queryRaw = jest.fn();
    const map = await batchLastMessagesByConversationId(
      { $queryRaw: queryRaw },
      [],
    );
    expect(map.size).toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('maps latest SENT rows by conversationId', async () => {
    const sentAt = new Date('2026-08-01T12:00:00.000Z');
    const queryRaw = jest.fn().mockResolvedValue([
      {
        conversationId: 'c1',
        text: 'hello',
        senderId: 'u2',
        createdAt: sentAt,
      },
    ]);
    const map = await batchLastMessagesByConversationId(
      { $queryRaw: queryRaw },
      ['c1', 'c2'],
    );
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(map.get('c1')).toEqual({
      conversationId: 'c1',
      text: 'hello',
      senderId: 'u2',
      createdAt: sentAt,
    });
    expect(map.has('c2')).toBe(false);
  });

  it('skips blank ids and dedupes before querying', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    await batchLastMessagesByConversationId({ $queryRaw: queryRaw }, [
      'c1',
      '',
      'c1',
      '  ',
    ]);
    expect(queryRaw).toHaveBeenCalledTimes(1);
  });

  it('SQL filters SENT only (excludes DELETED) with DISTINCT ON order', async () => {
    const queryRaw = jest.fn().mockResolvedValue([]);
    await batchLastMessagesByConversationId({ $queryRaw: queryRaw }, ['c1']);
    const sql = queryRaw.mock.calls[0]?.[0] as {
      strings?: readonly string[];
    };
    const sqlText = Array.isArray(sql.strings) ? sql.strings.join(' ') : '';
    expect(sqlText).toContain('DISTINCT ON');
    expect(sqlText).toMatch(/status\s*=\s*'SENT'/);
    expect(sqlText).toContain('"createdAt"');
    expect(sqlText).toContain('"id"');
  });
});
