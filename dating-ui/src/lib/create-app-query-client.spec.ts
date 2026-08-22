import { describe, expect, it } from 'vitest';
import {
  APP_QUERY_DEFAULTS,
  createAppQueryClient,
} from './create-app-query-client';

describe('createAppQueryClient', () => {
  it('applies APP_QUERY_DEFAULTS to query defaultOptions', () => {
    const client = createAppQueryClient();
    expect(client.getDefaultOptions().queries).toMatchObject(APP_QUERY_DEFAULTS);
  });
});
