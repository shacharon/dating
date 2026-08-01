/** @vitest-environment jsdom */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import {
  QueryClientTestProvider,
  createTestQueryClient,
} from '@/test/query-client-wrapper';

function Probe() {
  const client = useQueryClient();
  return <span data-testid="qc">{client ? 'ok' : 'missing'}</span>;
}

describe('QueryClientTestProvider', () => {
  it('exposes a QueryClient to children', () => {
    const client = createTestQueryClient();
    const { getByTestId } = render(
      <QueryClientTestProvider client={client}>
        <Probe />
      </QueryClientTestProvider>,
    );
    expect(getByTestId('qc').textContent).toBe('ok');
  });
});
