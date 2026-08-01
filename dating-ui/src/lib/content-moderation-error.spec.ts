import { describe, expect, it } from 'vitest';
import {
  ContentModerationApiError,
  MessagingMutedError,
  parseContentModerationErrorBody,
  parseMessagingMutedErrorBody,
} from './content-moderation-error';

describe('parseContentModerationErrorBody', () => {
  it('parses profile moderation details', () => {
    const err = parseContentModerationErrorBody(
      400,
      JSON.stringify({
        error: 'content_moderation_failed',
        message: 'Your profile contains inappropriate content',
        details: {
          field: 'aboutPartner',
          category: 'sexual',
          source: 'dating_blocklist',
          flaggedText: 'wanna fuck',
          flaggedTextIndex: 0,
          flaggedTextLength: 10,
          reason: 'Direct sexual solicitation',
          suggestion: 'Describe connection or interests instead.',
          exampleAlternative: 'Looking for someone adventurous',
        },
      }),
    );

    expect(err).toBeInstanceOf(ContentModerationApiError);
    expect(err?.code).toBe('content_moderation_failed');
    expect(err?.details).toMatchObject({
      field: 'aboutPartner',
      category: 'sexual',
      source: 'dating_blocklist',
      flaggedText: 'wanna fuck',
      reason: 'Direct sexual solicitation',
      suggestion: 'Describe connection or interests instead.',
      exampleAlternative: 'Looking for someone adventurous',
    });
    expect(err?.message).toBe('Describe connection or interests instead.');
  });

  it('parses message moderation with muted label', () => {
    const err = parseContentModerationErrorBody(
      400,
      JSON.stringify({
        error: 'message_content_moderation_failed',
        message: 'Your message contains inappropriate content',
        details: {
          category: 'sexual',
          source: 'openai',
          flaggedText: 'explicit text',
          reason: 'Sexual content',
          suggestion: 'Keep messages respectful.',
          muted: '1 hour',
        },
      }),
    );

    expect(err?.code).toBe('message_content_moderation_failed');
    expect(err?.details.muted).toBe('1 hour');
    expect(err?.details.flaggedText).toBe('explicit text');
  });

  it('allows missing flaggedText when reason/suggestion present', () => {
    const err = parseContentModerationErrorBody(
      400,
      JSON.stringify({
        error: 'content_moderation_failed',
        details: {
          category: 'hate',
          reason: 'Hate speech',
          suggestion: 'Remove hateful language.',
        },
      }),
    );
    expect(err?.details.flaggedText).toBe('');
    expect(err?.details.reason).toBe('Hate speech');
  });

  it('returns null for non-moderation bodies', () => {
    expect(
      parseContentModerationErrorBody(
        400,
        JSON.stringify({ error: 'nickname_taken', message: 'taken' }),
      ),
    ).toBeNull();
    expect(
      parseContentModerationErrorBody(
        403,
        JSON.stringify({
          error: 'content_moderation_failed',
          details: { category: 'x', reason: 'y', suggestion: 'z' },
        }),
      ),
    ).toBeNull();
    expect(parseContentModerationErrorBody(400, 'not-json')).toBeNull();
  });

  it('returns null when category or reason/suggestion missing', () => {
    expect(
      parseContentModerationErrorBody(
        400,
        JSON.stringify({
          error: 'content_moderation_failed',
          details: { suggestion: 'only suggestion' },
        }),
      ),
    ).toBeNull();
    expect(
      parseContentModerationErrorBody(
        400,
        JSON.stringify({
          error: 'content_moderation_failed',
          details: { category: 'sexual' },
        }),
      ),
    ).toBeNull();
  });
});

describe('parseMessagingMutedErrorBody', () => {
  it('parses messaging_muted with mutedUntil', () => {
    const err = parseMessagingMutedErrorBody(
      403,
      JSON.stringify({
        error: 'messaging_muted',
        message: 'Messaging is temporarily restricted',
        details: { mutedUntil: '2026-08-02T12:00:00.000Z' },
      }),
    );
    expect(err).toBeInstanceOf(MessagingMutedError);
    expect(err?.code).toBe('messaging_muted');
    expect(err?.mutedUntil).toBe('2026-08-02T12:00:00.000Z');
    expect(err?.message).toBe('Messaging is temporarily restricted');
  });

  it('returns null for other 403 bodies', () => {
    expect(
      parseMessagingMutedErrorBody(
        403,
        JSON.stringify({ message: 'Forbidden' }),
      ),
    ).toBeNull();
    expect(parseMessagingMutedErrorBody(400, '{}')).toBeNull();
  });
});
