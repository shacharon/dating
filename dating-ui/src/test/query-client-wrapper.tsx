/** @vitest-environment jsdom */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement, ReactNode } from 'react';

export function createTestQueryClient(
  overrides?: ConstructorParameters<typeof QueryClient>[0],
): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
    ...overrides,
  });
}

export function QueryClientTestProvider({
  children,
  client,
}: {
  children: ReactNode;
  client?: QueryClient;
}): ReactElement {
  const queryClient = client ?? createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
