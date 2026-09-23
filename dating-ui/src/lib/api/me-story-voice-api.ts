/**
 * Story voice → draft (Sprint 75 Story 2). Multipart audio; draft is client-only until Continue.
 */

import { getApiBase } from '@/lib/api/api-base';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';
import { parseContentModerationErrorBody } from '@/lib/moderation/content-moderation-error';

export type StoryVoiceDraftResponse = {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
  language: string;
  durationSeconds: number;
  usage: {
    whisperSeconds: number;
    chatInputTokens: number;
    chatOutputTokens: number;
  };
};

export class StoryVoiceApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'StoryVoiceApiError';
    this.status = status;
    this.code = code;
  }
}

function apiUnreachableMessage(base: string, path: string): string {
  const hint =
    base === ''
      ? 'Start dating-api on port 3001 (or set API_PROXY_TARGET in next.config env).'
      : 'Start dating-api and confirm NEXT_PUBLIC_API_URL / CORS.';
  return `Network error calling ${base || '(same-origin)'}${path}. ${hint}`;
}

export async function postStoryVoiceDraft(
  audio: Blob,
  durationSeconds: number,
): Promise<StoryVoiceDraftResponse> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/story/voice-draft';
  const form = new FormData();
  const ext =
    audio.type.includes('mp4') || audio.type.includes('m4a')
      ? 'm4a'
      : audio.type.includes('mpeg')
        ? 'mp3'
        : audio.type.includes('wav')
          ? 'wav'
          : 'webm';
  form.append('audio', audio, `recording.${ext}`);
  form.append('durationSeconds', String(Math.round(durationSeconds)));

  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'POST',
      body: form,
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);

  const text = await res.text();

  if (!res.ok) {
    const moderation = parseContentModerationErrorBody(res.status, text);
    if (moderation) {
      throw moderation;
    }
    let body: { error?: unknown; message?: unknown } | null = null;
    if (text) {
      try {
        body = JSON.parse(text) as { error?: unknown; message?: unknown };
      } catch {
        body = null;
      }
    }
    const code =
      typeof body?.error === 'string' ? body.error : `http_${res.status}`;
    const message =
      typeof body?.message === 'string'
        ? body.message
        : `POST ${path} failed: ${res.status}`;
    throw new StoryVoiceApiError(res.status, code, message);
  }

  if (!text) {
    throw new StoryVoiceApiError(res.status, 'empty_body', 'Empty voice draft response');
  }
  return JSON.parse(text) as StoryVoiceDraftResponse;
}
