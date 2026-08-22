import { describe, expect, it } from 'vitest';
import { isReactQueryDevtoolsEnabled } from './react-query-devtools-panel';

describe('isReactQueryDevtoolsEnabled', () => {
  it('is enabled only in development', () => {
    expect(isReactQueryDevtoolsEnabled('development')).toBe(true);
    expect(isReactQueryDevtoolsEnabled('test')).toBe(false);
    expect(isReactQueryDevtoolsEnabled('production')).toBe(false);
  });
});
