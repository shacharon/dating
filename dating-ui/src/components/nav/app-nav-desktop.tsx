'use client';

import type { AppCopySchema, AppLocale } from '@/lib/i18n';
import { NavAuth } from '@/components/nav-auth';
import {
  isConversationsActive,
  isMatchesActive,
  isProfileActive,
} from './nav-active';
import { ConversationsIcon, MatchesIcon, ProfileIcon } from './nav-icons';
import { NavItem } from './nav-item';

export type AppNavChromeProps = {
  pathname: string;
  locale: AppLocale;
  copy: AppCopySchema;
  navPending: boolean;
  onNavClick: (href: string) => void;
  totalUnread: number;
  newMatchCount?: number;
};

/** Sticky top navigation for md+ viewports (Matches, Conversations, Profile). */
export function AppNavDesktop({
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
    <header className="sticky top-0 z-40 hidden border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 md:block">
      <div className="mx-auto flex max-w-5xl items-center gap-x-6 px-4 py-2">
        <span className="shrink-0 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {copy.nav.brand}
        </span>
        <nav
          className="flex min-w-0 flex-1 items-center gap-x-5"
          aria-label={copy.nav.mainAria}
        >
          <NavItem
            variant="desktop"
            href="/dating/me-matches"
            label={copy.nav.matches}
            active={matchesActive}
            icon={<MatchesIcon filled={matchesActive} />}
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
            variant="desktop"
            href="/dating/conversations"
            label={copy.nav.conversations}
            active={conversationsActive}
            icon={<ConversationsIcon filled={conversationsActive} />}
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
            variant="desktop"
            href="/profile"
            label={copy.nav.profile}
            active={profileActive}
            icon={<ProfileIcon filled={profileActive} />}
            onClick={() => onNavClick('/profile')}
            pending={navPending}
          />
        </nav>
        <div className="shrink-0">
          <NavAuth locale={locale} />
        </div>
      </div>
    </header>
  );
}
