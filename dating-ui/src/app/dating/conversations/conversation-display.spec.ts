import { describe, it, expect } from 'vitest';
import {
  CONVERSATION_PREVIEW_MAX_CHARS,
  formatConversationPreview,
  normalizePreviewText,
  truncatePreviewText,
} from './conversation-display';

const copy = {
  youPrefix: 'You: ',
  noMessagesYet: 'No messages yet',
};

describe('conversation preview helpers', () => {
  it('normalizes newlines and whitespace', () => {
    expect(normalizePreviewText('  hello\n\nworld  \t')).toBe('hello world');
  });

  it('truncates at 60 code points with ellipsis', () => {
    const long = 'a'.repeat(CONVERSATION_PREVIEW_MAX_CHARS + 5);
    const out = truncatePreviewText(long);
    expect([...out].length).toBe(CONVERSATION_PREVIEW_MAX_CHARS + 1);
    expect(out.endsWith('…')).toBe(true);
  });

  it('truncates emoji-safe by code points', () => {
    const emoji = '😀'.repeat(CONVERSATION_PREVIEW_MAX_CHARS + 2);
    const out = truncatePreviewText(emoji);
    expect([...out.slice(0, -1)].length).toBe(CONVERSATION_PREVIEW_MAX_CHARS);
    expect(out.endsWith('…')).toBe(true);
  });

  it('returns noMessagesYet for null lastMessage', () => {
    expect(formatConversationPreview(null, 'user_me', copy)).toBe(
      'No messages yet',
    );
  });

  it('prefixes You: for own messages', () => {
    expect(
      formatConversationPreview(
        {
          text: 'Thanks for sharing!',
          senderId: 'user_me',
          sentAt: '2026-08-01T12:00:00.000Z',
        },
        'user_me',
        copy,
      ),
    ).toBe('You: Thanks for sharing!');
  });

  it('does not prefix for peer messages', () => {
    expect(
      formatConversationPreview(
        {
          text: 'Hey there',
          senderId: 'user_peer',
          sentAt: '2026-08-01T12:00:00.000Z',
        },
        'user_me',
        copy,
      ),
    ).toBe('Hey there');
  });

  it('collapses multiline before truncate in formatConversationPreview', () => {
    const text = `line1\nline2 ${'x'.repeat(80)}`;
    const out = formatConversationPreview(
      { text, senderId: 'user_peer', sentAt: '2026-08-01T12:00:00.000Z' },
      'user_me',
      copy,
    );
    expect(out.includes('\n')).toBe(false);
    expect(out.endsWith('…')).toBe(true);
  });
});
