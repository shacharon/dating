import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONVERSATION_PREVIEW_MAX_CHARS,
  formatConversationPreview,
  formatMessageTime,
  normalizePreviewText,
  truncatePreviewText,
} from './conversation-display';
import { enCopy } from '@/lib/i18n/en';

const copy = {
  youPrefix: 'You: ',
  noMessagesYet: 'No messages yet',
};

const format = enCopy.conversations.format;

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

describe('formatMessageTime', () => {
  beforeEach(() => {
    // Saturday 2026-08-01 15:00 local — avoid UTC drift for calendar buckets
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 1, 15, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns justNow for < 1 minute', () => {
    const created = new Date(2026, 7, 1, 14, 59, 30).toISOString();
    expect(formatMessageTime(created, format, 'en')).toBe('Just now');
  });

  it('returns minutesAgo for < 60 minutes', () => {
    const created = new Date(2026, 7, 1, 14, 45, 0).toISOString();
    expect(formatMessageTime(created, format, 'en')).toBe('15m ago');
  });

  it('returns clock time for today ≥ 1h', () => {
    const created = new Date(2026, 7, 1, 10, 30, 0);
    const out = formatMessageTime(created.toISOString(), format, 'en');
    expect(out).toBe(
      created.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' }),
    );
  });

  it('returns yesterdayAt for yesterday', () => {
    const created = new Date(2026, 6, 31, 14, 45, 0);
    const time = created.toLocaleTimeString('en', {
      hour: 'numeric',
      minute: '2-digit',
    });
    expect(formatMessageTime(created.toISOString(), format, 'en')).toBe(
      `Yesterday ${time}`,
    );
  });

  it('returns weekday + time for this week (day diff 2…6)', () => {
    // Wednesday Jul 29 → 3 days before Sat Aug 1
    const created = new Date(2026, 6, 29, 11, 5, 0);
    const time = created.toLocaleTimeString('en', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const weekday = created.toLocaleDateString('en', { weekday: 'short' });
    expect(formatMessageTime(created.toISOString(), format, 'en')).toBe(
      `${weekday}, ${time}`,
    );
  });

  it('returns medium date + time for older (≥ 7 days)', () => {
    const created = new Date(2026, 6, 20, 9, 0, 0);
    const time = created.toLocaleTimeString('en', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const datePart = created.toLocaleDateString('en', { dateStyle: 'medium' });
    expect(formatMessageTime(created.toISOString(), format, 'en')).toBe(
      `${datePart} ${time}`,
    );
  });
});
