'use client';

import type { ReactNode } from 'react';

type Props = {
  id: string;
  title: string;
  complete: boolean;
  active: boolean;
  children: ReactNode;
};

/**
 * Edit section pane chrome. Inactive panes stay mounted (`hidden`) for form state.
 */
export function ProfileEditSectionShell({
  id,
  title,
  complete,
  active,
  children,
}: Props) {
  return (
    <section
      id={id}
      className="scroll-mt-28 space-y-3"
      data-testid={`profile-edit-section-${id}`}
      hidden={!active}
      aria-hidden={!active}
    >
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
        {complete ? (
          <span
            className="ml-2 text-sm font-medium text-emerald-600 dark:text-emerald-400"
            aria-label="complete"
          >
            ✓
          </span>
        ) : null}
      </h2>
      <div>{children}</div>
    </section>
  );
}
