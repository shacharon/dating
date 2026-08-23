import { MessageStatus, MutualMatchStatus } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  LAST_MESSAGE_BATCH_SIZE,
  PrismaConversationRepository,
  UNREAD_COUNT_BATCH_SIZE,
  batchLastMessagesByConversationId,
  batchUnreadCountsByConversationId,
} from './prisma-conversation.repository';
import { queryInboxListPage } from './inbox-list-page.query';

jest.mock('./inbox-list-page.query', () => {
  const actual = jest.requireActual<typeof import('./inbox-list-page.query')>(
    './inbox-list-page.query',
  );
  return {
    ...actual,
    queryInboxListPage: jest.fn(actual.queryInboxListPage),
  };
});

const queryInboxListPageMock = queryInboxListPage as jest.MockedFunction<
  typeof queryInboxListPage
>;

describe('PrismaConversationRepository', () => {
  const mutualMatch = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const userProfile = {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  };
  const message = {
    count: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  };
  const prisma = {
    mutualMatch,
    userProfile,
    message,
    $queryRaw: jest.fn(),
  } as unknown as PrismaService;

  let repo: PrismaConversationRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PrismaConversationRepository(prisma);
  });

  it('createSentMessage persists SENT with messageSelect fields', async () => {
    const row = {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      text: 'hi',
      clientMessageId: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      status: MessageStatus.SENT,
    };
    message.create.mockResolvedValue(row);

    const result = await repo.createSentMessage({
      conversationId: 'c1',
      senderId: 'u1',
      text: 'hi',
    });

    expect(message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'c1',
        senderId: 'u1',
        text: 'hi',
        clientMessageId: null,
        status: MessageStatus.SENT,
      },
      select: expect.objectContaining({
        id: true,
        conversationId: true,
        senderId: true,
        text: true,
        clientMessageId: true,
        createdAt: true,
        status: true,
      }),
    });
    expect(result).toEqual({ row, created: true });
  });

  it('markUnmatched sets UNMATCHED + unmatchedAt/by', async () => {
    mutualMatch.update.mockResolvedValue({});
    const at = new Date('2026-02-01T00:00:00.000Z');

    await repo.markUnmatched('c1', 'u1', at);

    expect(mutualMatch.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: {
        status: MutualMatchStatus.UNMATCHED,
        unmatchedAt: at,
        unmatchedByUserId: 'u1',
      },
    });
  });

  it('batchUnreadCountsByConversationId chunks at UNREAD_COUNT_BATCH_SIZE', async () => {
    const specs = Array.from({ length: UNREAD_COUNT_BATCH_SIZE + 1 }, (_, i) => ({
      conversationId: `c${i}`,
      otherUserId: `u${i}`,
      lastReadAt: null as Date | null,
    }));
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([{ conversationId: 'c0', cnt: 2 }])
      .mockResolvedValueOnce([{ conversationId: `c${UNREAD_COUNT_BATCH_SIZE}`, cnt: 1 }]);

    const map = await batchUnreadCountsByConversationId(prisma, specs);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(map.get('c0')).toBe(2);
    expect(map.get(`c${UNREAD_COUNT_BATCH_SIZE}`)).toBe(1);
  });

  it('listInboxPage delegates to queryInboxListPage', async () => {
    queryInboxListPageMock.mockResolvedValue({
      rows: [],
      hasMore: false,
    });

    const result = await repo.listInboxPage({
      sessionUserId: 'u1',
      cursor: null,
      limit: 20,
    });

    expect(queryInboxListPageMock).toHaveBeenCalledWith(prisma, {
      sessionUserId: 'u1',
      cursor: null,
      limit: 20,
    });
    expect(result).toEqual({ rows: [], hasMore: false });
  });

  it('batchLastMessagesByConversationId chunks at LAST_MESSAGE_BATCH_SIZE', async () => {
    const ids = Array.from(
      { length: LAST_MESSAGE_BATCH_SIZE + 1 },
      (_, i) => `c${i}`,
    );
    (prisma.$queryRaw as jest.Mock)
      .mockResolvedValueOnce([
        {
          conversationId: 'c0',
          text: 'a',
          senderId: 'u',
          createdAt: new Date('2026-01-01'),
        },
      ])
      .mockResolvedValueOnce([]);

    const map = await batchLastMessagesByConversationId(prisma, ids);

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    expect(map.get('c0')?.text).toBe('a');
  });
});
