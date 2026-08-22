import { QueryClient } from '@tanstack/react-query';

/**
 * Global TanStack Query defaults — Sprint 29 lock, reaffirmed FE-02 Story 1.
 * Per-domain overrides (e.g. 5 min stale for matches) land in FE-02 Stories 3–5.
 */
export const APP_QUERY_DEFAULTS = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  retry: 1,
} as const;

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...APP_QUERY_DEFAULTS },
    },
  });
}
