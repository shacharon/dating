import { describe, expect, it } from 'vitest';
import {
  APP_QUERY_DEFAULTS,
  createAppQueryClient,
} from './create-app-query-client';
import { queryRetryDelay, shouldRetryQuery } from './query-retry';

describe('createAppQueryClient', () => {
  it('applies APP_QUERY_DEFAULTS to query defaultOptions', () => {
    const client = createAppQueryClient();
    const queries = client.getDefaultOptions().queries;
    expect(queries?.staleTime).toBe(APP_QUERY_DEFAULTS.staleTime);
    expect(queries?.refetchOnWindowFocus).toBe(
      APP_QUERY_DEFAULTS.refetchOnWindowFocus,
    );
    expect(queries?.refetchOnReconnect).toBe(
      APP_QUERY_DEFAULTS.refetchOnReconnect,
    );
    expect(queries?.networkMode).toBe(APP_QUERY_DEFAULTS.networkMode);
    expect(queries?.retry).toBe(shouldRetryQuery);
    expect(queries?.retryDelay).toBe(queryRetryDelay);
  });

  it('disables mutation retries by default', () => {
    const client = createAppQueryClient();
    expect(client.getDefaultOptions().mutations?.retry).toBe(false);
  });
});
