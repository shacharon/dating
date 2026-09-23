/** @vitest-environment node */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRequestIdContextForTests } from '@/lib/observability/request-id';
import {
  postStoryVoiceDraft,
  StoryVoiceApiError,
} from '@/lib/api/me-story-voice-api';
import { ContentModerationApiError } from '@/lib/moderation/content-moderation-error';

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

describe('postStoryVoiceDraft', () => {
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

  it('POSTs multipart with audio and durationSeconds', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            aboutMe: 'a',
            aboutPartner: 'b',
            aboutRelationship: 'c',
            language: 'en',
            durationSeconds: 12,
            usage: {
              whisperSeconds: 12,
              chatInputTokens: 1,
              chatOutputTokens: 2,
            },
          }),
      }),
    );
    globalThis.fetch = fetchMock;

    const blob = new Blob([new Uint8Array(8)], { type: 'audio/webm' });
    const result = await postStoryVoiceDraft(blob, 12.4);

    expect(result.aboutMe).toBe('a');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/api/v1/me/profile/story/voice-draft');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect(form.get('durationSeconds')).toBe('12');
    expect(form.get('audio')).toBeTruthy();
  });

  it('throws StoryVoiceApiError on 429', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 429,
        text: async () =>
          JSON.stringify({
            error: 'voice_draft_rate_limited',
            message: 'Too many voice drafts. Please try again later.',
          }),
      }),
    );

    await expect(
      postStoryVoiceDraft(new Blob([new Uint8Array(4)], { type: 'audio/webm' }), 10),
    ).rejects.toMatchObject({
      name: 'StoryVoiceApiError',
      status: 429,
      code: 'voice_draft_rate_limited',
    });
  });

  it('throws ContentModerationApiError on moderation 400', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: 'content_moderation_failed',
            message: 'Your profile contains inappropriate content',
            details: {
              field: 'aboutMe',
              category: 'sexual',
              source: 'dating_blocklist',
              flaggedText: 'x',
              reason: 'r',
              suggestion: 's',
            },
          }),
      }),
    );

    await expect(
      postStoryVoiceDraft(new Blob([new Uint8Array(4)], { type: 'audio/webm' }), 10),
    ).rejects.toBeInstanceOf(ContentModerationApiError);
  });

  it('throws StoryVoiceApiError class for other 400s', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 400,
        text: async () =>
          JSON.stringify({
            error: 'voice_duration_invalid',
            message: 'bad duration',
          }),
      }),
    );

    await expect(
      postStoryVoiceDraft(new Blob([new Uint8Array(4)], { type: 'audio/webm' }), 1),
    ).rejects.toBeInstanceOf(StoryVoiceApiError);
  });
});
