import { describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from './middleware';

describe('middleware (Phase 2 profile routes)', () => {
  it('redirects unauthenticated /onboarding to /login with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/onboarding'));
    const res = middleware(req);
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get('location');
    expect(loc).toBeTruthy();
    expect(loc).toMatch(/\/login/);
    expect(loc).toMatch(/next=/);
    expect(decodeURIComponent(loc!)).toContain('/onboarding');
  });

  it('redirects unauthenticated /dating/profile to /login', () => {
    const req = new NextRequest(new URL('http://localhost:3000/dating/profile'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toMatch(/\/login/);
    expect(decodeURIComponent(loc!)).toContain('/dating/profile');
  });

  it('allows / when no session cookie', () => {
    const req = new NextRequest(new URL('http://localhost:3000/'));
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('allows /onboarding when session cookie is present', () => {
    const req = new NextRequest(new URL('http://localhost:3000/onboarding'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('redirects unauthenticated /profile to /login with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profile'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toMatch(/\/login/);
    expect(decodeURIComponent(loc!)).toContain('/profile');
  });

  it('redirects unauthenticated /app to /login with next param', () => {
    const req = new NextRequest(new URL('http://localhost:3000/app'));
    const res = middleware(req);
    const loc = res.headers.get('location');
    expect(loc).toMatch(/\/login/);
    expect(decodeURIComponent(loc!)).toContain('/app');
  });

  it('allows /profile when session cookie is present', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profile'));
    req.cookies.set('dating_session', 'opaque-token');
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });

  it('does not treat /profiles as /profile (no redirect to login from middleware for /profiles)', () => {
    const req = new NextRequest(new URL('http://localhost:3000/profiles'));
    const res = middleware(req);
    expect(res.headers.get('location')).toBeNull();
  });
});
