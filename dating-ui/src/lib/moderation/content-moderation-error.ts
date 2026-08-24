/**
 * Parse Nest-style content moderation / messaging mute error bodies from dating-api.
 */

export type ContentModerationDetails = {
  field?: 'aboutMe' | 'aboutPartner' | 'aboutRelationship' | string;
  category: string;
  source?: 'openai' | 'dating_blocklist' | 'dating_score' | string;
  flaggedText: string;
  flaggedTextIndex?: number;
  flaggedTextLength?: number;
  reason: string;
  suggestion: string;
  exampleAlternative?: string;
  muted?: string;
};

export type ContentModerationErrorCode =
  | 'content_moderation_failed'
  | 'message_content_moderation_failed';

export class ContentModerationApiError extends Error {
  readonly code: ContentModerationErrorCode;
  readonly details: ContentModerationDetails;

  constructor(
    code: ContentModerationErrorCode,
    details: ContentModerationDetails,
    apiMessage?: string,
  ) {
    super(
      details.suggestion ||
        apiMessage ||
        'Your content was blocked by moderation policy',
    );
    this.name = 'ContentModerationApiError';
    this.code = code;
    this.details = details;
  }
}

export class MessagingMutedError extends Error {
  readonly code = 'messaging_muted' as const;
  readonly mutedUntil: string | null;

  constructor(message: string, mutedUntil: string | null = null) {
    super(message);
    this.name = 'MessagingMutedError';
    this.mutedUntil = mutedUntil;
  }
}

function asNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Returns a typed moderation error when the body is a known moderation 400.
 * Returns null for other statuses / shapes (caller keeps legacy Error paths).
 */
export function parseContentModerationErrorBody(
  status: number,
  bodyText: string,
): ContentModerationApiError | null {
  if (status !== 400) return null;
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: string;
      message?: string;
      details?: Record<string, unknown>;
    };
    const code = parsed.error;
    if (
      code !== 'content_moderation_failed' &&
      code !== 'message_content_moderation_failed'
    ) {
      return null;
    }
    const d = parsed.details;
    if (!d || typeof d !== 'object') return null;

    const category = asNonEmptyString(d.category);
    const reason = asNonEmptyString(d.reason) ?? '';
    const suggestion = asNonEmptyString(d.suggestion) ?? '';
    if (!category || (!reason && !suggestion)) return null;

    const details: ContentModerationDetails = {
      category,
      flaggedText: typeof d.flaggedText === 'string' ? d.flaggedText : '',
      reason,
      suggestion,
    };

    const field = asNonEmptyString(d.field);
    if (field) details.field = field;

    const source = asNonEmptyString(d.source);
    if (source) details.source = source;

    if (typeof d.flaggedTextIndex === 'number') {
      details.flaggedTextIndex = d.flaggedTextIndex;
    }
    if (typeof d.flaggedTextLength === 'number') {
      details.flaggedTextLength = d.flaggedTextLength;
    }

    const example = asNonEmptyString(d.exampleAlternative);
    if (example) details.exampleAlternative = example;

    const muted = asNonEmptyString(d.muted);
    if (muted) details.muted = muted;

    return new ContentModerationApiError(code, details, parsed.message);
  } catch {
    return null;
  }
}

/**
 * Parse 403 messaging mute body. Returns null when not a mute response.
 */
export function parseMessagingMutedErrorBody(
  status: number,
  bodyText: string,
): MessagingMutedError | null {
  if (status !== 403) return null;
  try {
    const parsed = JSON.parse(bodyText) as {
      error?: string;
      message?: string;
      details?: { mutedUntil?: string | null };
    };
    if (parsed.error !== 'messaging_muted') return null;
    const mutedUntil =
      typeof parsed.details?.mutedUntil === 'string'
        ? parsed.details.mutedUntil
        : parsed.details?.mutedUntil === null
          ? null
          : null;
    return new MessagingMutedError(
      parsed.message ??
        'Messaging is temporarily restricted due to previous content violations',
      mutedUntil,
    );
  } catch {
    return null;
  }
}
