import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRequestIdContextForTests } from '@/lib/observability/request-id';
import { sendConversationMessage } from '@/lib/api/conversations-api';
import {
  ContentModerationApiError,
  MessagingMutedError,
} from '@/lib/moderation/content-moderation-error';

function mockResponse(init: {
  ok: boolean;
  status: number;
  statusText?: string;
  text: () => Promise<string>;
}): Response {
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? '',
    headers: new Headers(),
    text: init.text,
  } as Response;
}

describe('sendConversationMessage moderation', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
    resetRequestIdContextForTests();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('throws ContentModerationApiError with details on moderation 400', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: 'message_content_moderation_failed',
            message: 'Your message contains inappropriate content',
            details: {
              category: 'sexual',
              source: 'dating_blocklist',
              flaggedText: 'bad phrase',
              reason: 'Direct sexual solicitation',
              suggestion: 'Keep it respectful.',
              muted: '1 hour',
            },
          }),
      }),
    );

    let caught: unknown;
    try {
      await sendConversationMessage('conv-1', 'bad phrase');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ContentModerationApiError);
    const err = caught as ContentModerationApiError;
    expect(err.details.flaggedText).toBe('bad phrase');
    expect(err.details.muted).toBe('1 hour');
    expect(err.details.suggestion).toBe('Keep it respectful.');
  });

  it('throws MessagingMutedError on 403 messaging_muted (not access denied)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 403,
        text: async () =>
          JSON.stringify({
            error: 'messaging_muted',
            message:
              'Messaging is temporarily restricted due to previous content violations',
            details: { mutedUntil: '2026-08-02T00:00:00.000Z' },
          }),
      }),
    );

    let caught: unknown;
    try {
      await sendConversationMessage('conv-1', 'hello');
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(MessagingMutedError);
    expect((caught as Error).message).not.toMatch(/do not have access/i);
    expect((caught as MessagingMutedError).mutedUntil).toBe(
      '2026-08-02T00:00:00.000Z',
    );
  });

  it('keeps access-denied message for other 403s', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: 'Forbidden' }),
      }),
    );

    await expect(sendConversationMessage('conv-1', 'hello')).rejects.toThrow(
      'You do not have access to this conversation.',
    );
  });
});
