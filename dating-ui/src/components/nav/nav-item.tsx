'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { formatNavBadgeCount } from './nav-active';

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:focus-visible:ring-zinc-500';

export type NavItemVariant = 'desktop' | 'mobile';

type NavItemProps = {
  href: string;
  label: string;
  active: boolean;
  icon: ReactNode;
  badgeCount?: number;
  badgeAriaLabel?: string;
  badgeTestId?: string;
  onClick?: () => void;
  pending?: boolean;
  variant: NavItemVariant;
};

/** Single primary-nav control with optional unread/new badge. */
export function NavItem({
  href,
  label,
  active,
  icon,
  badgeCount = 0,
  badgeAriaLabel,
  badgeTestId,
  onClick,
  pending = false,
  variant,
}: NavItemProps) {
  const showBadge = badgeCount > 0;
  const pendingClass = pending ? 'cursor-wait opacity-60' : '';

  if (variant === 'mobile') {
    return (
      <Link
        href={href}
        prefetch
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={`relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1 text-[11px] transition-colors ${focusRing} ${
          active
            ? 'font-semibold text-zinc-900 dark:text-zinc-100'
            : 'font-medium text-zinc-500 dark:text-zinc-400'
        } ${pendingClass}`}
      >
        <span className="relative inline-flex">
          {icon}
          {showBadge ? (
            <span
              data-testid={badgeTestId}
              aria-label={badgeAriaLabel}
              className="absolute -right-2.5 -top-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1 py-0.5 text-[10px] font-semibold leading-none text-white dark:bg-emerald-500"
            >
              {formatNavBadgeCount(badgeCount)}
            </span>
          ) : null}
        </span>
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      prefetch
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 border-b-2 py-2 text-sm transition-colors ${focusRing} ${
        active
          ? 'border-zinc-900 font-semibold text-zinc-900 dark:border-zinc-100 dark:text-zinc-100'
          : 'border-transparent font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
      } ${pendingClass}`}
    >
      {icon}
      <span>{label}</span>
      {showBadge ? (
        <span
          data-testid={badgeTestId}
          aria-label={badgeAriaLabel}
          className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-600 px-1.5 py-0.5 text-xs font-semibold text-white dark:bg-emerald-500"
        >
          {formatNavBadgeCount(badgeCount)}
        </span>
      ) : null}
    </Link>
  );
}
