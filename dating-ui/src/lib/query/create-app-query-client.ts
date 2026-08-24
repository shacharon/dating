import { QueryClient } from '@tanstack/react-query';
import { queryRetryDelay, shouldRetryQuery } from '@/lib/query/query-retry';

/**
 * Global TanStack Query defaults — Sprint 29 lock, reaffirmed FE-02 Story 1.
 * Per-domain overrides (e.g. 5 min stale for matches) land in FE-02 Stories 3–5.
 * FE-06 Story 3: offline-aware retry + reconnect refetch.
 */
export const APP_QUERY_DEFAULTS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  networkMode: 'online' as const,
  retry: shouldRetryQuery,
  retryDelay: queryRetryDelay,
} as const;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...APP_QUERY_DEFAULTS },
      mutations: { retry: false },
    },
  });
}
