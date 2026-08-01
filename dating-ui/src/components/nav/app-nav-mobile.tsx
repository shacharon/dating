'use client';

import { NavAuth } from '@/components/nav-auth';
import type { AppNavChromeProps } from './app-nav-desktop';
import {
  isConversationsActive,
  isMatchesActive,
  isProfileActive,
} from './nav-active';
import { ConversationsIcon, MatchesIcon, ProfileIcon } from './nav-icons';
import { NavItem } from './nav-item';

/** Fixed bottom tab bar for small viewports; shares chrome props with desktop. */
export function AppNavMobile({
  pathname,
  locale,
  copy,
  navPending,
  onNavClick,
  totalUnread,
  newMatchCount = 0,
}: AppNavChromeProps) {
  const matchesActive = isMatchesActive(pathname);
  const conversationsActive = isConversationsActive(pathname);
  const profileActive = isProfileActive(pathname);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <span className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {copy.nav.brand}
          </span>
          <NavAuth locale={locale} />
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-zinc-800 dark:bg-zinc-950 md:hidden"
        aria-label={copy.nav.primaryAria}
      >
        <div className="mx-auto flex max-w-5xl items-stretch">
          <NavItem
            variant="mobile"
            href="/dating/me-matches"
            label={copy.nav.matches}
            active={matchesActive}
            icon={<MatchesIcon filled={matchesActive} className="h-5 w-5" />}
            badgeCount={newMatchCount}
            badgeAriaLabel={
              newMatchCount > 0
                ? copy.nav.matchesNewLabel(newMatchCount)
                : undefined
            }
            badgeTestId="nav-matches-new"
            onClick={() => onNavClick('/dating/me-matches')}
            pending={navPending}
          />
          <NavItem
            variant="mobile"
            href="/dating/conversations"
            label={copy.nav.conversations}
            active={conversationsActive}
            icon={
              <ConversationsIcon
                filled={conversationsActive}
                className="h-5 w-5"
              />
            }
            badgeCount={totalUnread}
            badgeAriaLabel={
              totalUnread > 0
                ? copy.nav.conversationsUnreadLabel(totalUnread)
                : undefined
            }
            badgeTestId="nav-conversations-unread"
            onClick={() => onNavClick('/dating/conversations')}
            pending={navPending}
          />
          <NavItem
            variant="mobile"
            href="/profile"
            label={copy.nav.profile}
            active={profileActive}
            icon={<ProfileIcon filled={profileActive} className="h-5 w-5" />}
            onClick={() => onNavClick('/profile')}
            pending={navPending}
          />
        </div>
      </nav>
    </>
  );
}
