'use client';

import Link from 'next/link';
import type { AppCopySchema } from '@/lib/i18n';

export function LandingFooter({
  copy,
}: {
  copy: Pick<
    AppCopySchema['landing'],
    'privacyLink' | 'termsLink' | 'supportLink'
  >;
}) {
  return (
    <footer
      dir="ltr"
      lang="en"
      className="border-t border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
    >
      <Link href="/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-300">
        {copy.privacyLink}
      </Link>
      <span className="mx-2" aria-hidden="true">
        ·
      </span>
      <Link href="/terms" className="hover:text-zinc-700 dark:hover:text-zinc-300">
        {copy.termsLink}
      </Link>
      <span className="mx-2" aria-hidden="true">
        ·
      </span>
      <Link
        href="/support"
        data-testid="landing-support-link"
        className="hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        {copy.supportLink}
      </Link>
    </footer>
  );
}
