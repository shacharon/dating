import { Suspense } from 'react';
import { ProfilesCompareClient } from './profiles-compare-client';

export default function ProfilesComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-6 dark:bg-zinc-950">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading compare…</p>
        </div>
      }
    >
      <ProfilesCompareClient />
    </Suspense>
  );
}
