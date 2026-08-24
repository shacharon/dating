import { Suspense } from 'react';
import ProfileHubClient from './profile-hub-client';
import { buildPageMetadata } from '@/lib/platform/page-metadata';

export async function generateMetadata() {
  return buildPageMetadata({
    title: (copy) => copy.profile.hub.title,
    description: (copy) => copy.profile.viewPage.subtitle,
  });
}

export default function ProfileHubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500">…</p>
        </div>
      }
    >
      <ProfileHubClient />
    </Suspense>
  );
}
