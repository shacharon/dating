/** Sprint 75 Story 2 — voice → story draft. */

export const STORY_VOICE_DRAFT_RATE_LIMIT_MAX_PER_WINDOW = 5;
export const STORY_VOICE_DRAFT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const STORY_VOICE_MIN_DURATION_SECONDS = 5;
export const STORY_VOICE_MAX_DURATION_SECONDS = 120;
export const STORY_VOICE_MAX_BYTES = 8 * 1024 * 1024;

export const STORY_VOICE_ALLOWED_MIME_PREFIXES = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-wav',
  'audio/x-m4a',
] as const;

export function httpStoryVoiceDraftRateLimitRedisKey(userId: string): string {
  return `http:voice-draft:ratelimit:${userId}`;
}

export function isAllowedStoryVoiceMime(mimetype: string): boolean {
  const base = mimetype.split(';')[0]?.trim().toLowerCase() ?? '';
  return STORY_VOICE_ALLOWED_MIME_PREFIXES.some(
    (allowed) => base === allowed || base.startsWith(`${allowed}`),
  );
}
