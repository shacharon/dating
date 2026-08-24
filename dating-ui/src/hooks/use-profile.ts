'use client';

import { useCallback } from 'react';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from '@tanstack/react-query';
import { datingApi } from '@/lib/api-sdk';
import type {
  CreateMeProfileBody,
  MeProfileDto,
  MeProfileSubmitResult,
  PatchMeProfileBody,
} from '@/lib/api-types/profile';
import { queryKeys } from '@/lib/query/query-keys';

export const PROFILE_STALE_TIME_MS = 300_000;

export type UseProfileResult = {
  profile: MeProfileDto | null;
  isLoading: boolean;
  isSuccess: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

export function setProfileInCache(
  queryClient: QueryClient,
  profile: MeProfileDto | null,
): void {
  queryClient.setQueryData(queryKeys.me.profile.detail, profile);
}

export function getProfileFromCache(
  queryClient: QueryClient,
): MeProfileDto | null | undefined {
  return queryClient.getQueryData<MeProfileDto | null>(
    queryKeys.me.profile.detail,
  );
}

function isProfileAlreadyExistsError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return (
    msg.includes(' 409 ') || msg.toLowerCase().includes('profile_already_exists')
  );
}

export function useProfile(): UseProfileResult {
  const { data, isPending, isSuccess, isFetching, error, refetch } = useQuery({
    queryKey: queryKeys.me.profile.detail,
    queryFn: () => datingApi.profile.fetchMyProfile(),
    staleTime: PROFILE_STALE_TIME_MS,
  });

  const refetchProfile = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    profile: data === undefined ? null : data,
    isLoading: isPending && data === undefined,
    isSuccess,
    isFetching,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch: refetchProfile,
  };
}

export function usePatchProfile(): UseMutationResult<
  MeProfileDto,
  Error,
  PatchMeProfileBody
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body) => datingApi.profile.patchMyProfile(body),
    onSuccess: (dto) => {
      setProfileInCache(queryClient, dto);
    },
  });
}

export function useCreateProfile(): UseMutationResult<
  MeProfileDto,
  Error,
  CreateMeProfileBody
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body) => {
      try {
        return await datingApi.profile.createMyProfile(body);
      } catch (e) {
        if (isProfileAlreadyExistsError(e)) {
          return datingApi.profile.patchMyProfile(body);
        }
        throw e;
      }
    },
    onSuccess: (dto) => {
      setProfileInCache(queryClient, dto);
    },
  });
}

export function useSubmitProfileForAnalysis(): UseMutationResult<
  MeProfileSubmitResult,
  Error,
  void
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => datingApi.profile.submitMyProfileForAnalysis(),
    onSuccess: (result) => {
      setProfileInCache(queryClient, result.profile);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.matches.list,
      });
    },
  });
}
