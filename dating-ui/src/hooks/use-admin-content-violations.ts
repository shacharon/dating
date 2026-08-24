'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  getAdminContentViolationStats,
  listAdminBlockedUsers,
  listAdminContentViolations,
  unblockAdminContentUser,
} from '@/lib/admin/admin-content-violations-api';
import { messageFromAdminFetchError } from '@/lib/admin/admin-fetch-error';
import { queryKeys } from '@/lib/query/query-keys';

const FORBIDDEN = 'You are not authorized to view content violations.';
const LOAD_FALLBACK = 'Failed to load violations';

/** Admin content-violations page model (React Query). */
export function useAdminContentViolationsPage() {
  const queryClient = useQueryClient();
  const [surface, setSurface] = useState('');
  const [category, setCategory] = useState('');
  const [action, setAction] = useState('');
  const [userStatus, setUserStatus] = useState('');
  const [hasRecipient, setHasRecipient] = useState('');
  const [userId, setUserId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const listFilters = useMemo(
    () => ({
      surface,
      category,
      action,
      userStatus,
      hasRecipient,
      userId: userId.trim(),
    }),
    [surface, category, action, userStatus, hasRecipient, userId],
  );

  useEffect(() => {
    setLocalError(null);
  }, [listFilters]);

  const blockedQuery = useQuery({
    queryKey: queryKeys.admin.contentViolations.blocked,
    queryFn: () => listAdminBlockedUsers({ limit: 50, offset: 0 }),
  });

  const listQuery = useQuery({
    queryKey: queryKeys.admin.contentViolations.list(listFilters),
    queryFn: () =>
      listAdminContentViolations({
        surface: listFilters.surface || undefined,
        category: listFilters.category || undefined,
        action: listFilters.action || undefined,
        userStatus: listFilters.userStatus || undefined,
        hasRecipient: listFilters.hasRecipient === '1' || undefined,
        userId: listFilters.userId || undefined,
        limit: 50,
        offset: 0,
      }),
  });

  const statsQuery = useQuery({
    queryKey: queryKeys.admin.contentViolations.stats,
    queryFn: () => getAdminContentViolationStats(),
  });

  const unblockMutation = useMutation({
    mutationFn: ({
      targetUserId,
      reason,
    }: {
      targetUserId: string;
      reason: string;
    }) => unblockAdminContentUser(targetUserId, reason),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.contentViolations.blocked,
        }),
        queryClient.invalidateQueries({
          queryKey: ['admin', 'content-violations', 'list'],
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.admin.contentViolations.stats,
        }),
      ]);
    },
  });

  const queryError =
    blockedQuery.error ?? listQuery.error ?? statsQuery.error ?? null;
  const mutationError = unblockMutation.error ?? null;
  const error =
    localError ??
    (queryError
      ? messageFromAdminFetchError(queryError, {
          forbiddenMessage: FORBIDDEN,
          fallbackMessage: LOAD_FALLBACK,
        })
      : null) ??
    (mutationError
      ? messageFromAdminFetchError(mutationError, {
          forbiddenMessage: FORBIDDEN,
          fallbackMessage: 'Unblock failed',
        })
      : null);

  const loading =
    blockedQuery.isLoading || listQuery.isLoading || statsQuery.isLoading;

  async function handleUnblock(targetUserId: string) {
    const reason = window.prompt('Reason for unblock (required):');
    if (reason == null) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setLocalError('Unblock reason is required.');
      return;
    }
    setLocalError(null);
    try {
      await unblockMutation.mutateAsync({
        targetUserId,
        reason: trimmed,
      });
    } catch {
      // error surfaced via mutationError
    }
  }

  async function reload() {
    setLocalError(null);
    await Promise.all([
      blockedQuery.refetch(),
      listQuery.refetch(),
      statsQuery.refetch(),
    ]);
  }

  return {
    blockedUsers: blockedQuery.data?.users ?? [],
    blockedTotal: blockedQuery.data?.total ?? 0,
    rows: listQuery.data?.violations ?? [],
    stats: statsQuery.data ?? null,
    total: listQuery.data?.total ?? 0,
    surface,
    setSurface,
    category,
    setCategory,
    action,
    setAction,
    userStatus,
    setUserStatus,
    hasRecipient,
    setHasRecipient,
    userId,
    setUserId,
    loading,
    error,
    busyUserId: unblockMutation.isPending
      ? (unblockMutation.variables?.targetUserId ?? null)
      : null,
    reload,
    unblock: handleUnblock,
  };
}
