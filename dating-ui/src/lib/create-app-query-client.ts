import { QueryClient } from '@tanstack/react-query';

/** Locked Sprint 29 Story 3 defaults. */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: true,
        retry: 1,
      },
    },
  });
}
