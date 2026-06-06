import { emitProductLog } from '@/lib/observability/product-logger';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';
import { isInternalRouteBlocked } from '@/lib/internal-routes-gate';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SESSION_COOKIE =
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME?.trim() || 'dating_session';

function needsAuthSession(pathname: string): boolean {
  return (
    pathname.startsWith('/dating') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/settings') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/app' ||
    pathname.startsWith('/app/')
  );
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isInternalRouteBlocked(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  if (pathname === '/login') {
    const landing = new URL('/', request.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      landing.searchParams.set(key, value);
    });
    return NextResponse.redirect(landing);
  }

  if (!needsAuthSession(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token?.trim()) {
    const landing = new URL('/', request.url);
    landing.searchParams.set('next', `${pathname}${search}`);
    const incomingRid = request.headers.get('x-request-id')?.trim() ?? null;
    emitProductLog({
      level: 'trace',
      route: pathname,
      message: 'middleware: unauthenticated, redirect to public landing',
      errorCode: UiErrorCodes.UI_MIDDLEWARE_AUTH_REDIRECT,
      requestId: incomingRid,
      meta: { next: `${pathname}${search}` },
    });
    return NextResponse.redirect(landing);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dating',
    '/dating/:path*',
    '/onboarding',
    '/onboarding/:path*',
    '/profile',
    '/profile/:path*',
    '/app',
    '/app/:path*',
    '/settings',
    '/settings/:path*',
    '/profiles',
    '/profiles/:path*',
    '/evaluate',
    '/evaluate/:path*',
    '/auto-matches',
    '/auto-matches/:path*',
    '/dev',
    '/dev/:path*',
  ],
};
