/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import type { MeProfileDto } from '@/lib/api-types/profile';
import { queryKeys } from '@/lib/query/query-keys';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';
import {
  PROFILE_STALE_TIME_MS,
  setProfileInCache,
  useCreateProfile,
  usePatchProfile,
  useProfile,
  useSubmitProfileForAnalysis,
} from './use-profile';

const {
  fetchMyProfile,
  patchMyProfile,
  createMyProfile,
  submitMyProfileForAnalysis,
} = vi.hoisted(() => ({
  fetchMyProfile: vi.fn(),
  patchMyProfile: vi.fn(),
  createMyProfile: vi.fn(),
  submitMyProfileForAnalysis: vi.fn(),
}));

vi.mock('@/lib/api-sdk', () => ({
  datingApi: {
    profile: {
      fetchMyProfile,
      patchMyProfile,
      createMyProfile,
      submitMyProfileForAnalysis,
    },
  },
}));

const sampleProfile: MeProfileDto = {
  id: 'p1',
  userId: 'u1',
  status: 'DRAFT',
  onboardingStep: 'BASIC',
  nickname: 'Noa',
  aboutMe: null,
  aboutPartner: null,
  aboutRelationship: null,
  gender: 'FEMALE',
  desiredPartnerGenders: ['MALE'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};

function renderProfileHook() {
  const client = createTestQueryClient();
  const view = renderHook(() => useProfile(), {
    wrapper: ({ children }) =>
      createElement(QueryClientTestProvider, { client }, children),
  });
  return { ...view, client };
}

describe('use-profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches profile via useQuery', async () => {
    fetchMyProfile.mockResolvedValueOnce(sampleProfile);

    const { result } = renderProfileHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchMyProfile).toHaveBeenCalledTimes(1);
    expect(result.current.profile).toEqual(sampleProfile);
    expect(result.current.error).toBeNull();
  });

  it('returns null profile when API returns no row', async () => {
    fetchMyProfile.mockResolvedValueOnce(null);

    const { result } = renderProfileHook();

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.profile).toBeNull();
  });

  it('serves cached profile on remount within staleTime', async () => {
    fetchMyProfile.mockResolvedValue(sampleProfile);
    const client = createTestQueryClient({
      defaultOptions: {
        queries: {
          staleTime: PROFILE_STALE_TIME_MS,
          retry: false,
          refetchOnWindowFocus: false,
        },
      },
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientTestProvider, { client }, children);

    const first = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => {
      expect(first.result.current.isLoading).toBe(false);
    });

    first.unmount();

    const second = renderHook(() => useProfile(), { wrapper });
    await waitFor(() => {
      expect(second.result.current.profile).toEqual(sampleProfile);
    });

    expect(fetchMyProfile).toHaveBeenCalledTimes(1);
  });

  it('patch mutation updates profile cache', async () => {
    fetchMyProfile.mockResolvedValueOnce(sampleProfile);
    patchMyProfile.mockResolvedValueOnce({
      ...sampleProfile,
      nickname: 'Updated',
    });

    const client = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      createElement(QueryClientTestProvider, { client }, children);

    const { result: profileResult } = renderHook(() => useProfile(), {
      wrapper,
    });
    await waitFor(() => {
      expect(profileResult.current.isLoading).toBe(false);
    });

    const { result: patchResult } = renderHook(() => usePatchProfile(), {
      wrapper,
    });

    await patchResult.current.mutateAsync({ nickname: 'Updated' });

    expect(patchMyProfile).toHaveBeenCalledWith({ nickname: 'Updated' });
    expect(client.getQueryData(queryKeys.me.profile.detail)).toEqual({
      ...sampleProfile,
      nickname: 'Updated',
    });
  });

  it('create mutation falls back to patch on 409', async () => {
    createMyProfile.mockRejectedValueOnce(
      new Error('POST /api/v1/me/profile failed: 409 profile_already_exists'),
    );
    patchMyProfile.mockResolvedValueOnce(sampleProfile);

    const client = createTestQueryClient();
    const { result } = renderHook(() => useCreateProfile(), {
      wrapper: ({ children }) =>
        createElement(QueryClientTestProvider, { client }, children),
    });

    await result.current.mutateAsync({ nickname: 'Noa' });

    expect(createMyProfile).toHaveBeenCalled();
    expect(patchMyProfile).toHaveBeenCalledWith({ nickname: 'Noa' });
    expect(client.getQueryData(queryKeys.me.profile.detail)).toEqual(
      sampleProfile,
    );
  });

  it('submit mutation updates profile cache and invalidates matches list', async () => {
    setProfileInCache(createTestQueryClient(), sampleProfile);
    submitMyProfileForAnalysis.mockResolvedValueOnce({
      analysisJobId: 'job-1',
      profile: { ...sampleProfile, status: 'ANALYZING' },
    });

    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useSubmitProfileForAnalysis(), {
      wrapper: ({ children }) =>
        createElement(QueryClientTestProvider, { client }, children),
    });

    await result.current.mutateAsync();

    expect(submitMyProfileForAnalysis).toHaveBeenCalled();
    expect(client.getQueryData(queryKeys.me.profile.detail)).toEqual({
      ...sampleProfile,
      status: 'ANALYZING',
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.me.matches.list,
    });
  });
});
