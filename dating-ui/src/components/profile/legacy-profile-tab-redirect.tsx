'use client';

import { useLayoutEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { pathForLegacyTab, PROFILE_HREF } from '@/lib/profile/profile-hub-paths';
import { useAppLocale } from '@/lib/i18n';

/**
 * Redirects legacy profile hub query `tab` bookmarks to real routes,
 * preserving `#hash` (server never receives the fragment).
 */
export function LegacyProfileTabRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { copy } = useAppLocale();
  const tab = searchParams.get('tab');
  const [redirecting, setRedirecting] = useState(() => Boolean(tab));

  useLayoutEffect(() => {
    if (!tab) {
      setRedirecting(false);
      return;
    }
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const mapped = pathForLegacyTab(tab);
    const target =
      mapped != null ? `${mapped}${hash}` : `${PROFILE_HREF.overview}${hash}`;
    router.replace(target);
  }, [tab, router]);

  if (redirecting || tab) {
    return (
      <p
        className="text-sm text-zinc-500 dark:text-zinc-400"
        role="status"
        aria-live="polite"
      >
        {copy.common.loading}
      </p>
    );
  }

  return <>{children}</>;
}
