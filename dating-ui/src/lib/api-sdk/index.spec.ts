import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { datingApi, type DatingApiClient } from '@/lib/api-sdk';

vi.mock('@/lib/authenticated-fetch', () => ({
  authenticatedFetch: vi.fn(),
}));

import { authenticatedFetch } from '@/lib/authenticated-fetch';

const mockFetch = vi.mocked(authenticatedFetch);

function jsonResponse(body: unknown, init?: Partial<Response>): Response {
  return {
    ok: init?.ok ?? true,
    status: init?.status ?? 200,
    statusText: init?.statusText ?? 'OK',
    headers: new Headers(init?.headers),
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('datingApi SDK barrel', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('exposes matches, conversations, and profile namespaces', () => {
    expect(typeof datingApi.matches.fetchMyMatches).toBe('function');
    expect(typeof datingApi.conversations.fetchConversationsUnreadTotal).toBe(
      'function',
    );
    expect(typeof datingApi.profile.fetchMyProfile).toBe('function');
    const _client: DatingApiClient = datingApi;
    expect(_client.matches.likeMatch).toBe(datingApi.matches.likeMatch);
  });

  it('does not export internal recordMatchAction on matches namespace', () => {
    expect(
      'recordMatchAction' in datingApi.matches &&
        typeof (datingApi.matches as { recordMatchAction?: unknown })
          .recordMatchAction === 'function',
    ).toBe(false);
  });

  it('datingApi.matches.fetchMyMatches calls authenticatedFetch', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ status: 'ready', matches: [], hasMore: false }),
    );
    const dto = await datingApi.matches.fetchMyMatches({ limit: 10 });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/me/matches?limit=10',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(dto.status).toBe('ready');
  });

  it('datingApi.conversations.fetchConversationsUnreadTotal normalizes total', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ totalUnread: 3 }));
    const dto = await datingApi.conversations.fetchConversationsUnreadTotal();
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/v1/me/conversations/unread-total',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(dto.totalUnread).toBe(3);
  });

  it('datingApi.profile.fetchMyProfile returns null on 404', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse('', { ok: false, status: 404, statusText: 'Not Found' }),
    );
    const profile = await datingApi.profile.fetchMyProfile();
    expect(profile).toBeNull();
  });
});

describe('legacy shims re-export SDK functions', () => {
  it('me-matches-api shim resolves to same fetchMyMatches', async () => {
    mockFetch.mockResolvedValue(
      jsonResponse({ status: 'not_ready', reason: 'no_profile' }),
    );
    const { fetchMyMatches } = await import('@/lib/me-matches-api');
    const dto = await fetchMyMatches();
    expect(dto.status).toBe('not_ready');
    expect(mockFetch).toHaveBeenCalled();
  });

  it('conversations-api shim re-exports types and conversationPhotoSrc', async () => {
    const mod = await import('@/lib/conversations-api');
    expect(typeof mod.fetchMyConversations).toBe('function');
    expect(typeof mod.conversationPhotoSrc).toBe('function');
    expect(mod.conversationPhotoSrc('/photos/x.jpg')).toBe('/photos/x.jpg');
  });

  it('me-profile-api shim re-exports profile type constants', async () => {
    const { ME_PROFILE_GENDERS } = await import('@/lib/me-profile-api');
    expect(ME_PROFILE_GENDERS).toContain('MALE');
    expect(ME_PROFILE_GENDERS).toContain('FEMALE');
  });
});
