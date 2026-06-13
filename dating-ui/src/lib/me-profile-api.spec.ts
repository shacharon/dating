import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRequestIdContextForTests } from '@/lib/observability/request-id';
import {
  createMyProfile,
  deleteMyProfilePhoto,
  fetchMyProfilePhotoBlob,
  fetchMyLatestAnalysis,
  listMyProfilePhotos,
  fetchMyMatches,
  fetchMyProfile,
  fetchMatchFeedback,
  patchMyProfile,
  setPrimaryMyProfilePhoto,
  submitMyProfileForAnalysis,
  uploadMyProfilePhoto,
  upsertMatchFeedback,
} from '@/lib/me-profile-api';

function mockResponse(init: {
  ok: boolean;
  status: number;
  statusText?: string;
  text: () => Promise<string>;
  requestId?: string;
}): Response {
  const headers = new Headers();
  if (init.requestId) {
    headers.set('x-request-id', init.requestId);
  }
  return {
    ok: init.ok,
    status: init.status,
    statusText: init.statusText ?? '',
    headers,
    text: init.text,
  } as Response;
}

describe('me-profile-api', () => {
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

  it('fetchMyProfile throws on 401', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 401,
        text: async () => '',
        requestId: 'rid-401',
      }),
    );
    await expect(fetchMyProfile()).rejects.toThrow(/401/);
    const structured = errSpy.mock.calls
      .map((c) => c[0] as string)
      .filter((s) => {
        try {
          return JSON.parse(s).errorCode === 'UI_PROFILE_GET_FAIL';
        } catch {
          return false;
        }
      });
    expect(structured).toHaveLength(1);
    expect(JSON.parse(structured[0]).requestId).toBe('rid-401');
  });

  it('fetchMyProfile returns null on 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: false,
        status: 404,
        text: async () => '',
      }),
    );
    await expect(fetchMyProfile()).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  it('fetchMyProfile parses JSON on 200', async () => {
    const body = {
      id: '1',
      userId: 'u',
      status: 'DRAFT',
      onboardingStep: 'BASIC',
      aboutMe: 'hi',
      aboutPartner: null,
      aboutRelationship: null,
      createdAt: 't',
      updatedAt: 't',
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
      }),
    );
    await expect(fetchMyProfile()).resolves.toEqual(body);
  });

  it('createMyProfile POSTs JSON with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            id: 'p-new',
            userId: 'u',
            status: 'DRAFT',
            onboardingStep: 'BASIC',
            aboutMe: 'x',
            aboutPartner: null,
            aboutRelationship: null,
            createdAt: 't',
            updatedAt: 't',
          }),
      }),
    );
    await createMyProfile({ aboutMe: 'x' });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
        body: JSON.stringify({ aboutMe: 'x' }),
      }),
    );
  });

  it('patchMyProfile PATCHes JSON with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 'p-patch',
            userId: 'u',
            status: 'DRAFT',
            onboardingStep: 'BASIC',
            aboutMe: null,
            aboutPartner: 'y',
            aboutRelationship: null,
            createdAt: 't',
            updatedAt: 't',
          }),
      }),
    );
    await patchMyProfile({ aboutPartner: 'y' });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        body: JSON.stringify({ aboutPartner: 'y' }),
      }),
    );
  });

  it('submitMyProfileForAnalysis POSTs /api/v1/me/profile/submit with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 'p-sub',
            userId: 'u',
            status: 'SUBMITTED',
            onboardingStep: 'BASIC',
            aboutMe: null,
            aboutPartner: null,
            aboutRelationship: null,
            createdAt: 't',
            updatedAt: 't',
          }),
      }),
    );
    await submitMyProfileForAnalysis();
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/submit',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: '{}',
      }),
    );
  });

  it('fetchMyLatestAnalysis GETs /api/v1/me/profile/analysis/latest with credentials', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            userProfileId: 'prof-1',
            evaluationId: 'eval-1',
            createdAt: '2026-04-15T12:00:00.000Z',
            evaluationJson: { display: { summary: 'Hi' } },
          }),
      }),
    );
    const r = await fetchMyLatestAnalysis();
    expect(r?.evaluationId).toBe('eval-1');
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/analysis/latest',
      expect.objectContaining({
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      }),
    );
  });

  // ── Phase 4: fetchMyLatestAnalysis — no-profile guard ─────────────────────

  it('fetchMyLatestAnalysis returns null on 404 (no profile yet — UI guard redirects to onboarding)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 404, text: async () => '' }),
    );
    await expect(fetchMyLatestAnalysis()).resolves.toBeNull();
  });

  // ── Phase 4: fetchMyMatches ────────────────────────────────────────────────

  it('fetchMyMatches returns not_ready dto when API signals no_profile (UI guard redirects to onboarding)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'not_ready', reason: 'no_profile' }),
      }),
    );
    const result = await fetchMyMatches();
    expect(result.status).toBe('not_ready');
    expect(result.reason).toBe('no_profile');
  });

  it('fetchMyMatches returns not_ready dto when API signals not_analyzed (UI guard redirects to analysis)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'not_ready', reason: 'not_analyzed' }),
      }),
    );
    const result = await fetchMyMatches();
    expect(result.status).toBe('not_ready');
    expect(result.reason).toBe('not_analyzed');
  });

  it('fetchMyMatches returns not_ready dto when API signals no_photo (UI guard redirects to profile)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: 'not_ready', reason: 'no_photo' }),
      }),
    );
    const result = await fetchMyMatches();
    expect(result.status).toBe('not_ready');
    expect(result.reason).toBe('no_photo');
  });

  it('fetchMyMatches returns ready dto with matches array on success', async () => {
    const match = {
      id: 'prof-cand-1',
      gender: 'FEMALE',
      ageYears: 29,
      locationLabel: 'Tel Aviv',
      analyzedAt: '2026-04-18T00:00:00.000Z',
      hasEvaluation: true,
      matchScore: 13,
      explainability: { positiveChips: ['Emotionally grounded'], reasonShort: 'Strong emotional alignment' },
      recommendation: null,
    };
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'ready',
            viewerProfileId: 'prof-viewer',
            viewerGender: 'MALE',
            viewerAcceptedPartnerGenders: ['FEMALE'],
            totalCandidatesBeforeFilter: 3,
            matches: [match],
          }),
      }),
    );
    const result = await fetchMyMatches();
    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(1);
    expect(result.matches![0].id).toBe('prof-cand-1');
    expect(typeof result.matches![0].matchScore).toBe('number');
    expect(result.matches![0].explainability?.reasonShort).toBe('Strong emotional alignment');
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/matches',
      expect.objectContaining({ method: 'GET', credentials: 'include', cache: 'no-store' }),
    );
  });

  it('fetchMyMatches parses viewerProfileAnalysisStale when true', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            status: 'ready',
            viewerProfileId: 'prof-viewer',
            viewerProfileAnalysisStale: true,
            matches: [],
          }),
      }),
    );
    const result = await fetchMyMatches();
    expect(result.status).toBe('ready');
    expect(result.viewerProfileAnalysisStale).toBe(true);
  });

  it('fetchMyMatches throws on non-200 (network/server error surfaces cleanly)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error', text: async () => '' }),
    );
    await expect(fetchMyMatches()).rejects.toThrow(/500/);
  });

  it('listMyProfilePhotos GETs /api/v1/me/profile/photos', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify([
            {
              id: 'ph1',
              profileId: 'p1',
              storageKey: 'uploads/profile-photos/p1/ph1.jpg',
              originalFileName: 'a.jpg',
              mimeType: 'image/jpeg',
              sizeBytes: 123,
              position: 0,
              isPrimary: true,
              status: 'APPROVED',
              moderationProvider: 'stub',
              moderationResultJson: null,
              rejectionReason: null,
              createdAt: 't',
              updatedAt: 't',
            },
          ]),
      }),
    );
    const photos = await listMyProfilePhotos();
    expect(photos).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/photos',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('uploadMyProfilePhoto POSTs multipart form data', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            id: 'ph2',
            profileId: 'p1',
            storageKey: 'uploads/profile-photos/p1/ph2.jpg',
            originalFileName: 'b.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 321,
            position: 1,
            isPrimary: false,
            status: 'APPROVED',
            moderationProvider: 'stub',
            moderationResultJson: null,
            rejectionReason: null,
            createdAt: 't',
            updatedAt: 't',
          }),
      }),
    );
    const file = new File([new Uint8Array([1, 2, 3])], 'b.jpg', {
      type: 'image/jpeg',
    });
    await uploadMyProfilePhoto(file);
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/photos',
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });

  it('deleteMyProfilePhoto DELETEs by id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({ ok: true, status: 200, text: async () => '{"deleted":true}' }),
    );
    await deleteMyProfilePhoto('ph1');
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/photos/ph1',
      expect.objectContaining({ method: 'DELETE', credentials: 'include' }),
    );
  });

  it('setPrimaryMyProfilePhoto PATCHes primary endpoint', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            id: 'ph1',
            profileId: 'p1',
            storageKey: 'k',
            originalFileName: null,
            mimeType: 'image/png',
            sizeBytes: 10,
            position: 0,
            isPrimary: true,
            status: 'APPROVED',
            moderationProvider: 'stub',
            moderationResultJson: null,
            rejectionReason: null,
            createdAt: 't',
            updatedAt: 't',
          }),
      }),
    );
    const r = await setPrimaryMyProfilePhoto('ph1');
    expect(r.isPrimary).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/photos/ph1/primary',
      expect.objectContaining({ method: 'PATCH', credentials: 'include', body: '{}' }),
    );
  });

  it('fetchMyProfilePhotoBlob GETs file endpoint', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: '',
      headers: new Headers(),
      blob: async () => blob,
      text: async () => '',
    } as unknown as Response);
    const out = await fetchMyProfilePhotoBlob('ph1');
    expect(out.size).toBe(3);
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/profile/photos/ph1/file',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('fetchMatchFeedback parses GET response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ sentiment: 'POSITIVE' }),
      }),
    );
    await expect(fetchMatchFeedback('prof-1')).resolves.toEqual({
      sentiment: 'POSITIVE',
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/matches/prof-1/feedback',
      expect.objectContaining({ method: 'GET', credentials: 'include' }),
    );
  });

  it('upsertMatchFeedback PUTs lowercase sentiment', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      mockResponse({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            matchProfileId: 'prof-1',
            sentiment: 'NEGATIVE',
            createdAt: '2026-06-06T10:00:00.000Z',
            updatedAt: '2026-06-06T10:00:00.000Z',
          }),
      }),
    );
    await expect(upsertMatchFeedback('prof-1', 'negative')).resolves.toMatchObject({
      sentiment: 'NEGATIVE',
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://api.test/api/v1/me/matches/prof-1/feedback',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        body: JSON.stringify({ sentiment: 'negative' }),
      }),
    );
  });
});
