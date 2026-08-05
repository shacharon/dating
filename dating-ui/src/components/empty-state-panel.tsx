'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

export type EmptyStateAction = {
  label: string;
  /** Button click handler (mutually exclusive with href for primary/secondary). */
  onClick?: () => void;
  /** Link destination when navigation is preferred. */
  href?: string;
  testId?: string;
};

export type EmptyStatePanelProps = {
  title: string;
  description?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  testId?: string;
  /** Optional detail under description (e.g. technical error). */
  detail?: string;
  /** Defaults to status; use alert for load errors. */
  role?: 'status' | 'alert';
  children?: ReactNode;
};

function ActionControl({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: 'primary' | 'secondary';
}) {
  const className =
    variant === 'primary'
      ? 'inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500'
      : 'inline-flex min-h-11 items-center justify-center text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400';

  if (action.href) {
    return (
      <Link
        href={action.href}
        className={className}
        data-testid={action.testId}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      data-testid={action.testId}
      onClick={action.onClick}
    >
      {action.label}
    </button>
  );
}

/**
 * Thin centered empty / error layout — title, body, optional CTAs (Sprint 43 Story 3).
 */
export function EmptyStatePanel({
  title,
  description,
  primaryAction,
  secondaryAction,
  testId,
  detail,
  role = 'status',
  children,
}: EmptyStatePanelProps) {
  return (
    <div
      data-testid={testId}
      className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white px-6 py-10 text-center dark:border-zinc-800 dark:bg-zinc-900"
      role={role}
    >
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
      {detail ? (
        <p className="mt-2 max-w-md text-xs text-zinc-400 dark:text-zinc-500">
          {detail}
        </p>
      ) : null}
      {children}
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          {primaryAction ? (
            <ActionControl action={primaryAction} variant="primary" />
          ) : null}
          {secondaryAction ? (
            <ActionControl action={secondaryAction} variant="secondary" />
          ) : null}
        </div>
      )}
    </div>
  );
}
