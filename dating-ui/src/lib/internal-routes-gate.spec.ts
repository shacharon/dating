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

  it('blocks /dev routes in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
    expect(isInternalRouteBlocked('/dev')).toBe(true);
    expect(isInternalRouteBlocked('/dev/auth-test')).toBe(true);
  });

  it('does not block product match browse path', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
    expect(isInternalRouteBlocked('/dating/me-matches')).toBe(false);
    expect(isInternalRouteBlocked('/dating/me-matches/abc')).toBe(false);
    expect(isInternalRouteBlocked('/dating/matches')).toBe(false);
  });

  it('allows /dev in development', () => {
    process.env.NODE_ENV = 'development';
    expect(isInternalRouteBlocked('/dev')).toBe(false);
  });

  it('allows when escape hatch env is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = '1';
    expect(isInternalRouteBlocked('/dev')).toBe(false);
  });
});
