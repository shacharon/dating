import { isProductionEnv } from './is-production-env';

describe('isProductionEnv', () => {
  it('returns true when NODE_ENV is production', () => {
    expect(isProductionEnv({ NODE_ENV: 'production' })).toBe(true);
  });

  it('returns true when NODE_ENV has surrounding whitespace', () => {
    expect(isProductionEnv({ NODE_ENV: '  production  ' })).toBe(true);
  });

  it('returns false for development, test, and unset', () => {
    expect(isProductionEnv({ NODE_ENV: 'development' })).toBe(false);
    expect(isProductionEnv({ NODE_ENV: 'test' })).toBe(false);
    expect(isProductionEnv({})).toBe(false);
  });

  it('returns false for production-like but not exact values', () => {
    expect(isProductionEnv({ NODE_ENV: 'Production' })).toBe(false);
    expect(isProductionEnv({ NODE_ENV: 'prod' })).toBe(false);
  });
});
