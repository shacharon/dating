import { describe, expect, it } from 'vitest';
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

  it('allows /profile when session cookie is present', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profile'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not treat /profiles as /profile (no redirect from middleware for /profiles)', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profiles'));
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });
});
