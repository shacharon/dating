'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  getAdminReport,
  listAdminReports,
  updateAdminReport,
} from '@/lib/admin/admin-reports-api';
import { messageFromAdminFetchError } from '@/lib/admin/admin-fetch-error';
import { queryKeys } from '@/lib/query/query-keys';

const LIST_STATUS = 'OPEN';
const FORBIDDEN = 'You are not authorized to view the admin report queue.';
const LOAD_FALLBACK = 'Failed to load reports';

/** Admin reports page model (React Query). */
export function useAdminReportsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opsNote, setOpsNote] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: queryKeys.admin.reports.list(LIST_STATUS),
    queryFn: () => listAdminReports(LIST_STATUS),
  });

  const detailQuery = useQuery({
    queryKey: queryKeys.admin.reports.detail(selectedId ?? ''),
    queryFn: () => getAdminReport(selectedId!),
    enabled: Boolean(selectedId),
  });

  useEffect(() => {
    if (!selectedId) {
      setOpsNote('');
      return;
    }
    if (detailQuery.data) {
      setOpsNote(detailQuery.data.opsNote ?? '');
    }
  }, [selectedId, detailQuery.data]);

  useEffect(() => {
    if (!selectedId || !listQuery.data) return;
    if (!listQuery.data.items.some((row) => row.id === selectedId)) {
      setSelectedId(null);
    }
  }, [listQuery.data, selectedId]);

  const updateMutation = useMutation({
    mutationFn: ({
      status,
      note,
    }: {
      status: 'DISMISSED' | 'ACTION_TAKEN';
      note: string;
    }) => updateAdminReport(selectedId!, status, note),
    onSuccess: async () => {
      setSelectedId(null);
      setOpsNote('');
      await queryClient.invalidateQueries({
        queryKey: ['admin', 'reports'],
      });
    },
  });

  const queryError = listQuery.error ?? detailQuery.error ?? null;
  const mutationError = updateMutation.error ?? null;
  const error =
    localError ??
    (queryError
      ? messageFromAdminFetchError(queryError, {
          forbiddenMessage: FORBIDDEN,
          fallbackMessage:
            detailQuery.error && !listQuery.error
              ? 'Failed to load report detail'
              : LOAD_FALLBACK,
        })
      : null) ??
    (mutationError
      ? messageFromAdminFetchError(mutationError, {
          forbiddenMessage: FORBIDDEN,
          fallbackMessage: 'Update failed',
        })
      : null);

  async function resolve(status: 'DISMISSED' | 'ACTION_TAKEN') {
    if (!selectedId) return;
    setLocalError(null);
    try {
      await updateMutation.mutateAsync({ status, note: opsNote });
    } catch {
      // surfaced via mutationError
    }
  }

  return {
    rows: listQuery.data?.items ?? [],
    selectedId,
    setSelectedId,
    detail: detailQuery.data ?? null,
    loading: listQuery.isLoading,
    detailLoading: Boolean(selectedId) && detailQuery.isLoading,
    error,
    busy: updateMutation.isPending,
    opsNote,
    setOpsNote,
    resolve,
  };
}
