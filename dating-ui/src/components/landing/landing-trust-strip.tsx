'use client';

import type { AppCopySchema } from '@/lib/i18n';

export function LandingTrustStrip({
  copy,
}: {
  copy: AppCopySchema['landing']['trust'];
}) {
  const items = [copy.privacy, copy.moderation, copy.compatibility];
  return (
    <section
      className="border-y border-zinc-200 bg-zinc-50 py-10 dark:border-zinc-800 dark:bg-zinc-950"
      aria-label="Trust"
    >
      <ul className="mx-auto flex max-w-3xl flex-col gap-4 px-6 sm:flex-row sm:justify-between sm:gap-6">
        {items.map((label) => (
          <li
            key={label}
            className="font-sans text-sm font-medium text-zinc-700 dark:text-zinc-300 sm:text-center"
          >
            <span className="me-2 inline-block h-1.5 w-1.5 rounded-full bg-teal-700 align-middle dark:bg-teal-400" aria-hidden />
            {label}
          </li>
        ))}
      </ul>
    </section>
  );
}
