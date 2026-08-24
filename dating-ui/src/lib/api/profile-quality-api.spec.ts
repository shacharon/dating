import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchProfileQuality,
  qualitySuggestionChips,
} from '@/lib/api/profile-quality-api';

describe('profile-quality-api', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = 'http://quality.test';
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
    vi.restoreAllMocks();
  });

  it('fetchProfileQuality GETs quality with credentials', async () => {
    const body = {
      score: 55,
      completeness: {
        hasNickname: true,
        hasLocation: true,
        hasBasics: true,
        hasAboutMe: false,
        hasAboutPartner: false,
        hasAboutRelationship: false,
        hasApprovedPhoto: true,
      },
      suggestions: [
        { id: 'aboutMe', points: 20 },
        { id: 'aboutPartner', points: 20 },
      ],
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => body,
    } as Response);
    globalThis.fetch = fetchMock;

    const result = await fetchProfileQuality();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://quality.test/api/v1/me/profile/quality',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
    expect(result).toEqual(body);
  });

  it('fetchProfileQuality throws on non-OK', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(fetchProfileQuality()).rejects.toThrow(
      /GET \/api\/v1\/me\/profile\/quality failed: 404/,
    );
  });

  it('qualitySuggestionChips limits and maps hrefs', () => {
    const chips = qualitySuggestionChips(
      [
        { id: 'photo', points: 15 },
        { id: 'basics', points: 10 },
        { id: 'aboutMe', points: 20 },
      ],
      { photo: 'Add a photo', basics: 'Complete basic info' },
      2,
    );
    expect(chips).toEqual([
      {
        id: 'photo',
        label: 'Add a photo',
        href: '/profile?tab=edit#photos',
      },
      {
        id: 'basics',
        label: 'Complete basic info',
        href: '/profile?tab=edit#basic',
      },
    ]);
  });
});
