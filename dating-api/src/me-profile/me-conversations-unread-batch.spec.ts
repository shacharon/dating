import { batchUnreadCountsByConversationId } from './me-conversations-unread-batch';

describe('batchUnreadCountsByConversationId', () => {
  it('returns empty map for empty specs without querying', async () => {
    const queryRaw = jest.fn();
    const map = await batchUnreadCountsByConversationId(
      { $queryRaw: queryRaw },
      [],
    );
    expect(map.size).toBe(0);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('maps query rows and defaults missing ids to absent (caller uses 0)', async () => {
    const queryRaw = jest.fn().mockResolvedValue([
      { conversationId: 'c1', cnt: 4 },
    ]);
    const map = await batchUnreadCountsByConversationId(
      { $queryRaw: queryRaw },
      [
        {
          conversationId: 'c1',
          otherUserId: 'u2',
          lastReadAt: null,
        },
        {
          conversationId: 'c2',
          otherUserId: 'u3',
          lastReadAt: new Date('2026-01-01T00:00:00.000Z'),
        },
      ],
    );
    expect(queryRaw).toHaveBeenCalledTimes(1);
    expect(map.get('c1')).toBe(4);
    expect(map.has('c2')).toBe(false);
  });
});
