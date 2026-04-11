import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME?.trim() || 'dating_session';

function needsAuthSession(pathname: string): boolean {
  return (
    pathname.startsWith('/dating') ||
    pathname.startsWith('/onboarding') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/app' ||
    pathname.startsWith('/app/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!needsAuthSession(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token?.trim()) {
    const login = new URL('/login', request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dating/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/profile',
    '/profile/:path*',
    '/app',
    '/app/:path*',
  ],
};
