import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('middleware (Phase 2 profile routes)', () => {
  it('redirects unauthenticated /onboarding to / with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/onboarding'));
    const res = middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/onboarding');
  });

  it('redirects unauthenticated /dating/profile to / with next', () => {
    const req = new NextRequest(new URL('http://localhost:3000/dating/profile'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/dating/profile');
  });

  it('redirects /login to / preserving query string', () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/login?next=%2Fdating'),
    );
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/dating');
  });

  it('allows / when no session cookie', () => {
    const req = new NextRequest(new URL('http://localhost:3000/'));
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated /dating (root) to / with next', () => {
    const req = new NextRequest(new URL('http://localhost:3000/dating'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/dating');
  });

  it('allows /onboarding when session cookie is present', () => {
    const req = new NextRequest(new URL('http://localhost:3000/onboarding'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated /onboarding/basic to / with next', () => {
    const req = new NextRequest(new URL('http://localhost:3000/onboarding/basic'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/onboarding/basic');
  });

  it('redirects unauthenticated /profile to / with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profile'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/profile');
  });

  it('redirects unauthenticated /app to / with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/app'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/app');
  });

  it('redirects unauthenticated /admin/photos to / with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/admin/photos'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/admin/photos');
  });

  it('redirects unauthenticated /admin/reports to / with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/admin/reports'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/admin/reports');
  });

  it('redirects unauthenticated /admin/match-quality to / with next param', () => {
    const req = new NextRequest(
      new URL('http://localhost:3000/admin/match-quality'),
    );
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    const u = new URL(loc!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/admin/match-quality');
  });

  it('allows /profile when session cookie is present', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profile'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('middleware (internal routes prod gate)', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
  });

  it('returns 404 for /evaluate in production', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(new URL('http://localhost:3000/evaluate'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('returns 404 for /profiles in production', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(new URL('http://localhost:3000/profiles'));
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it('returns 404 for /dev in production', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(new URL('http://localhost:3000/dev/tools'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(404);
  });

  it('allows /profiles in non-production', () => {
    process.env.NODE_ENV = 'test';
    const req = new NextRequest(new URL('http://localhost:3000/profiles'));
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('returns 404 for /matches in production', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(new URL('http://localhost:3000/matches'));
    const res = middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('returns 404 for /dating/matches in production', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(new URL('http://localhost:3000/dating/matches'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('returns 404 for /dating/matches/:id in production', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(
      new URL('http://localhost:3000/dating/matches/prof-1'),
    );
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /dating/me-matches in production when authenticated', () => {
    process.env.NODE_ENV = 'production';
    const req = new NextRequest(new URL('http://localhost:3000/dating/me-matches'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /matches in non-production', () => {
    process.env.NODE_ENV = 'test';
    const req = new NextRequest(new URL('http://localhost:3000/matches'));
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /matches in production when escape hatch is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = '1';
    const req = new NextRequest(new URL('http://localhost:3000/matches'));
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /dating/matches in production when escape hatch is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = '1';
    const req = new NextRequest(new URL('http://localhost:3000/dating/matches'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });
});

describe('middleware (admin routes prod gate)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAdminEnabled = process.env.NEXT_PUBLIC_ADMIN_ENABLED;
  const originalAllowInternal = process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalAdminEnabled === undefined) {
      delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_ADMIN_ENABLED = originalAdminEnabled;
    }
    if (originalAllowInternal === undefined) {
      delete process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES;
    } else {
      process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = originalAllowInternal;
    }
  });

  it('returns 404 for /admin in production by default', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    const req = new NextRequest(new URL('http://localhost:3000/admin'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });

  it('returns 404 for /admin/photos and /admin/reports in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    for (const path of ['/admin/photos', '/admin/reports', '/admin/match-quality']) {
      const req = new NextRequest(new URL(`http://localhost:3000${path}`));
      req.cookies.set('dating_session', 'opaque-token');
      const res = middleware(req);
      expect(res.status).toBe(404);
      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('redirects unauthenticated /admin when ADMIN_ENABLED in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ADMIN_ENABLED = '1';
    const req = new NextRequest(new URL('http://localhost:3000/admin'));
    const res = middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const u = new URL(res.headers.get('location')!);
    expect(u.pathname).toBe('/');
    expect(u.searchParams.get('next')).toBe('/admin');
  });

  it('allows /admin in production when ADMIN_ENABLED and session present', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ADMIN_ENABLED = '1';
    const req = new NextRequest(new URL('http://localhost:3000/admin/photos'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /admin in non-production without ADMIN_ENABLED', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    const req = new NextRequest(new URL('http://localhost:3000/admin'));
    const res = middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
  });

  it('still returns 404 for /admin when ALLOW_INTERNAL_ROUTES is set in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES = '1';
    delete process.env.NEXT_PUBLIC_ADMIN_ENABLED;
    const req = new NextRequest(new URL('http://localhost:3000/admin/photos'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
  });
});
