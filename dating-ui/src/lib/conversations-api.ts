/**
 * Authenticated conversations list: GET `/api/v1/me/conversations` (session cookie).
 */

import { getApiBase } from '@/lib/api-base';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';

const credFetch = {
  credentials: 'include' as const,
};

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

function apiUnreachableMessage(base: string, path: string): string {
  return `Cannot reach API at ${base || 'same origin'}${path}. Is dating-api running?`;
}

export interface ConversationOtherUserDto {
  id: string;
  profileId: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  photoUrl: string | null;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
}

export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
}

export interface ConversationDetailDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  status: 'ACTIVE';
  lastReadAt: string | null;
}

export interface MarkConversationReadResponseDto {
  lastReadAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  status: 'SENT';
}

export interface MessageListDto {
  messages: MessageDto[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export async function fetchMyConversations(): Promise<ConversationListResponseDto> {
  const base = getApiBase();
  const path = '/api/v1/me/conversations';
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'GET',
      ...credFetch,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<ConversationListResponseDto>(res);
}

/**
 * Returns metadata for one conversation by `MutualMatch.id`.
 * Throws with message `'Conversation not found.'` on 404.
 * Throws with message `'You do not have access to this conversation.'` on 403.
 */
export async function fetchMyConversationById(
  id: string,
): Promise<ConversationDetailDto> {
  const base = getApiBase();
  const path = `/api/v1/me/conversations/${encodeURIComponent(id)}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'GET',
      ...credFetch,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Conversation not found.');
  }
  if (res.status === 403) {
    throw new Error('You do not have access to this conversation.');
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<ConversationDetailDto>(res);
}

/**
 * Soft-unmatch a conversation by `MutualMatch.id`.
 * Throws with message `'Conversation not found.'` on 404.
 * Throws with message `'You do not have access to this conversation.'` on 403.
 */
export async function unmatchMyConversation(id: string): Promise<void> {
  const base = getApiBase();
  const path = `/api/v1/me/conversations/${encodeURIComponent(id)}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'DELETE',
      ...credFetch,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 401) {
    throw new Error('You must be logged in to unmatch.');
  }
  if (res.status === 404) {
    throw new Error('Conversation not found.');
  }
  if (res.status === 403) {
    throw new Error('You do not have access to this conversation.');
  }
  if (res.status !== 204) {
    throw new Error(`DELETE ${path} failed: ${res.status} ${res.statusText}`);
  }
}

/**
 * Mark all messages in a conversation as read for the session user.
 * Throws with message `'Conversation not found.'` on 404.
 * Throws with message `'You do not have access to this conversation.'` on 403.
 */
export async function markConversationAsRead(
  conversationId: string,
): Promise<MarkConversationReadResponseDto> {
  const base = getApiBase();
  const path = `/api/v1/me/conversations/${encodeURIComponent(conversationId)}/read`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'PUT',
      ...credFetch,
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Conversation not found.');
  }
  if (res.status === 403) {
    throw new Error('You do not have access to this conversation.');
  }
  if (!res.ok) {
    throw new Error(`PUT ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MarkConversationReadResponseDto>(res);
}

/**
 * Load message history for a conversation (cursor pagination).
 * Throws with message `'Conversation not found.'` on 404.
 * Throws with message `'You do not have access to this conversation.'` on 403.
 */
export async function fetchConversationMessages(
  conversationId: string,
  options?: { limit?: number; before?: string; after?: string },
): Promise<MessageListDto> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (options?.limit != null) {
    params.set('limit', String(options.limit));
  }
  if (options?.before) {
    params.set('before', options.before);
  }
  if (options?.after) {
    params.set('after', options.after);
  }
  const query = params.toString();
  const path = `/api/v1/me/conversations/${encodeURIComponent(conversationId)}/messages${query ? `?${query}` : ''}`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'GET',
      ...credFetch,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Conversation not found.');
  }
  if (res.status === 403) {
    throw new Error('You do not have access to this conversation.');
  }
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MessageListDto>(res);
}

/**
 * Send a text message in a conversation.
 * Throws with message `'Conversation not found.'` on 404.
 * Throws with message `'You do not have access to this conversation.'` on 403.
 */
export async function sendConversationMessage(
  conversationId: string,
  text: string,
): Promise<MessageDto> {
  const base = getApiBase();
  const path = `/api/v1/me/conversations/${encodeURIComponent(conversationId)}/messages`;
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...credFetch,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Conversation not found.');
  }
  if (res.status === 403) {
    throw new Error('You do not have access to this conversation.');
  }
  if (res.status === 429) {
    throw new Error('Too many messages. Please wait.');
  }
  if (!res.ok) {
    const body = await readJson<{ message?: string }>(res);
    throw new Error(
      body.message ?? `POST ${path} failed: ${res.status} ${res.statusText}`,
    );
  }
  return readJson<MessageDto>(res);
}

/** Resolve photo URL for browser display (same-origin or explicit API base). */
export function conversationPhotoSrc(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  const base = getApiBase();
  return base ? `${base}${photoUrl}` : photoUrl;
}
