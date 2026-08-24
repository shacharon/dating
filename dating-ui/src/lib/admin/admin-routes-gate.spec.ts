import { afterEach, describe, expect, it } from 'vitest';
import { isAdminRouteBlocked } from './admin-routes-gate';

describe('isAdminRouteBlocked', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminEnabled = process.env.NEXT_PUBLIC_ADMIN_ENABLED;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAdminEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_ADMIN_ENABLED = originalAdminEnabled;
    }
  });

  it('blocks /admin paths in production by default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    expect(isAdminRouteBlocked('/admin')).toBe(true);
    expect(isAdminRouteBlocked('/admin/photos')).toBe(true);
    expect(isAdminRouteBlocked('/admin/reports')).toBe(true);
    expect(isAdminRouteBlocked('/admin/match-quality')).toBe(true);
  });

  it('does not block non-admin paths in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    expect(isAdminRouteBlocked('/dating/me-matches')).toBe(false);
    expect(isAdminRouteBlocked('/')).toBe(false);
  });

  it('allows /admin in non-production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    expect(isAdminRouteBlocked('/admin')).toBe(false);
    expect(isAdminRouteBlocked('/admin/photos')).toBe(false);
  });

  it('allows /admin in production when NEXT_PUBLIC_ADMIN_ENABLED=1', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ADMIN_ENABLED = '1';
    expect(isAdminRouteBlocked('/admin')).toBe(false);
    expect(isAdminRouteBlocked('/admin/photos')).toBe(false);
  });

  it('does not treat /administrator as an admin path', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    expect(isAdminRouteBlocked('/administrator')).toBe(false);
  });
});
