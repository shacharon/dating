/**
 * Authenticated conversations list: GET `/api/v1/me/conversations` (session cookie).
 */

import { getApiBase } from '@/lib/api-base';
import {
  parseContentModerationErrorBody,
  parseMessagingMutedErrorBody,
} from '@/lib/content-moderation-error';
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

export interface ConversationLastMessageDto {
  text: string;
  senderId: string;
  /** ISO-8601 */
  sentAt: string;
}

export interface ConversationListItemDto {
  id: string;
  otherUser: ConversationOtherUserDto;
  matchedAt: string;
  unreadCount: number;
  lastMessage: ConversationLastMessageDto | null;
}

export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ConversationsUnreadTotalDto {
  totalUnread: number;
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

export async function fetchMyConversations(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<ConversationListResponseDto> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (opts?.cursor) params.set('cursor', opts.cursor);
  if (opts?.limit != null) params.set('limit', String(opts.limit));
  const qs = params.toString();
  const path = `/api/v1/me/conversations${qs ? `?${qs}` : ''}`;
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
  const dto = await readJson<ConversationListResponseDto>(res);
  return {
    conversations: (dto.conversations ?? []).map((item) => ({
      ...item,
      lastMessage: item.lastMessage ?? null,
    })),
    nextCursor: dto.nextCursor ?? null,
    hasMore: Boolean(dto.hasMore),
  };
}

export async function fetchConversationsUnreadTotal(): Promise<ConversationsUnreadTotalDto> {
  const base = getApiBase();
  const path = '/api/v1/me/conversations/unread-total';
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
  const dto = await readJson<ConversationsUnreadTotalDto>(res);
  return { totalUnread: Number(dto.totalUnread) || 0 };
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
 * Throws `MessagingMutedError` on 403 `messaging_muted`.
 * Throws with message `'You do not have access to this conversation.'` on other 403.
 * Throws `ContentModerationApiError` on moderation 400.
 */
export async function sendConversationMessage(
  conversationId: string,
  text: string,
  opts?: { openerAttribution?: { originalOpener: string } },
): Promise<MessageDto> {
  const base = getApiBase();
  const path = `/api/v1/me/conversations/${encodeURIComponent(conversationId)}/messages`;
  const body: {
    text: string;
    openerAttribution?: { originalOpener: string };
  } = { text };
  const original = opts?.openerAttribution?.originalOpener?.trim();
  if (original) {
    body.openerAttribution = { originalOpener: original };
  }
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...credFetch,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (res.status === 404) {
    throw new Error('Conversation not found.');
  }
  if (res.status === 403) {
    const errBody = await res.text();
    const muted = parseMessagingMutedErrorBody(res.status, errBody);
    if (muted) throw muted;
    throw new Error('You do not have access to this conversation.');
  }
  if (res.status === 429) {
    throw new Error('Too many messages. Please wait.');
  }
  if (!res.ok) {
    const errBody = await res.text();
    const moderationError = parseContentModerationErrorBody(res.status, errBody);
    if (moderationError) throw moderationError;
    let message: string | undefined;
    try {
      message = (JSON.parse(errBody) as { message?: string }).message;
    } catch {
      // fall through
    }
    throw new Error(
      message ?? `POST ${path} failed: ${res.status} ${res.statusText}`,
    );
  }
  return readJson<MessageDto>(res);
}

/** Resolve photo URL for browser display (same-origin or explicit API base). */
export function conversationPhotoSrc(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  // Absolute / object URLs must not get API base prefixed (profile hero blobs, CDN).
  if (/^(blob:|data:|https?:)/i.test(photoUrl)) return photoUrl;
  const base = getApiBase();
  return base ? `${base}${photoUrl}` : photoUrl;
}
