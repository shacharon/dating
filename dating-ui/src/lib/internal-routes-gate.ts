export const INTERNAL_ROUTE_PREFIXES = ['/dev'] as const;

export function isInternalRouteBlocked(pathname: string): boolean {
  if (process.env.NEXT_PUBLIC_ALLOW_INTERNAL_ROUTES === '1') return false;
  if (process.env.NODE_ENV !== 'production') return false;
  return INTERNAL_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
