import { afterEach, describe, expect, it } from 'vitest';
import { isInternalRouteBlocked } from './internal-routes-gate';

describe('isInternalRouteBlocked', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllow = process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAllow === undefined) {
      delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
    } else {
      process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = originalAllow;
    }
  });

  it('blocks internal routes in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
    expect(isInternalRouteBlocked('/evaluate')).toBe(true);
    expect(isInternalRouteBlocked('/profiles/compare')).toBe(true);
    expect(isInternalRouteBlocked('/matches')).toBe(true);
    expect(isInternalRouteBlocked('/dating/matches')).toBe(true);
    expect(isInternalRouteBlocked('/dating/matches/abc')).toBe(true);
  });

  it('does not block product match browse path', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
    expect(isInternalRouteBlocked('/dating/me-matches')).toBe(false);
    expect(isInternalRouteBlocked('/dating/me-matches/abc')).toBe(false);
  });

  it('allows internal routes in development', () => {
    process.env.NODE_ENV = 'development';
    expect(isInternalRouteBlocked('/evaluate')).toBe(false);
  });

  it('allows when escape hatch env is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = '1';
    expect(isInternalRouteBlocked('/evaluate')).toBe(false);
  });
});
