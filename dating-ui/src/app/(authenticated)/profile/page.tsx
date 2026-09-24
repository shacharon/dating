import { Suspense } from 'react';
import { ProfileOverviewPageClient } from './profile-overview-page-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.profile.hub.title,
    description: (copy) => copy.profile.viewPage.subtitle,
  });
}

export default function ProfileOverviewPage() {
  return (
    <Suspense
      fallback={
        <p
          className="text-sm text-zinc-500"
          role="status"
          aria-live="polite"
        >
          Loading…
        </p>
      }
    >
      <ProfileOverviewPageClient />
    </Suspense>
  );
}
