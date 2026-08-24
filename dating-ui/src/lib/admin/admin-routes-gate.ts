/** Prefixes blocked in production unless NEXT_PUBLIC_ADMIN_ENABLED=1 */
export const ADMIN_ROUTE_PREFIX = '/admin';

export function isAdminRouteBlocked(pathname: string): boolean {
  if (
    pathname !== ADMIN_ROUTE_PREFIX &&
    !pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/`)
  ) {
    return false;
  }
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_ADMIN_ENABLED === '1') {
    return false;
  }
  return true;
}
