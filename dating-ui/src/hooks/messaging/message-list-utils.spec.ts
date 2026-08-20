import { describe, it, expect } from 'vitest';
import { appendUniqueMessages } from './message-list-utils';
import type { MessageDto } from '@/lib/conversations-api';

function msg(id: string, text = id): MessageDto {
  return {
    id,
    conversationId: 'c1',
    senderId: 'u1',
    text,
    createdAt: '2024-01-01T00:00:00Z',
    status: 'SENT',
  };
}

describe('appendUniqueMessages', () => {
  it('appends only new ids', () => {
    const prev = [msg('a'), msg('b')];
    const next = appendUniqueMessages(prev, [msg('b'), msg('c')]);
    expect(next.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns same reference when nothing new', () => {
    const prev = [msg('a')];
    expect(appendUniqueMessages(prev, [msg('a')])).toBe(prev);
  });
});
