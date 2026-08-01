'use client';

import { useConversationUnread } from '@/contexts/conversation-unread-context';
import type { AppCopySchema, AppLocale } from '@/lib/i18n';
import { AppNavDesktop } from './app-nav-desktop';
import { AppNavMobile } from './app-nav-mobile';

export type AppNavProps = {
  pathname: string;
  locale: AppLocale;
  copy: AppCopySchema;
  navPending: boolean;
  onNavClick: () => void;
  /** Reserved; wire API later. Defaults to 0. */
  newMatchCount?: number;
};

/**
 * Primary app chrome: sticky top nav on md+, fixed bottom tabs on mobile.
 * Must render inside ConversationUnreadProvider (MessagingShellProvider).
 */
export function AppNav({
  pathname,
  locale,
  copy,
  navPending,
  onNavClick,
  newMatchCount = 0,
}: AppNavProps) {
  const { totalUnread } = useConversationUnread();

  const shared = {
    pathname,
    locale,
    copy,
    navPending,
    onNavClick,
    totalUnread,
    newMatchCount,
  };

  return (
    <>
      <AppNavDesktop {...shared} />
      <AppNavMobile {...shared} />
    </>
  );
}
