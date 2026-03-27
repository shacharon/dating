import { Suspense } from 'react';
import MatchesPageClient from './matches-page-client';

export default function MatchesPocPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 p-6 font-sans text-sm text-zinc-500 dark:bg-zinc-950 dark:text-zinc-400">
          Loading…
        </div>
      }
    >
      <MatchesPageClient />
    </Suspense>
  );
}
