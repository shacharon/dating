/** Active-route helpers for primary app nav (Story 33.1). */

export function isMatchesActive(pathname: string): boolean {
  return (
    pathname.startsWith('/dating/me-matches') ||
    pathname.startsWith('/dating/matches')
  );
}

export function isConversationsActive(pathname: string): boolean {
  return pathname.startsWith('/dating/conversations');
}

export function isProfileActive(pathname: string): boolean {
  return (
    pathname === '/dating/profile' ||
    pathname.startsWith('/settings/profile') ||
    pathname.startsWith('/profile')
  );
}

export function formatNavBadgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}
