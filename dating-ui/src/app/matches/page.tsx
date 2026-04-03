import { Suspense } from 'react';
import MatchesPageClient from './matches-page-client';

function MatchesFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
    </div>
  );
}

export default function MatchesRoutePage() {
  return (
    <Suspense fallback={<MatchesFallback />}>
      <MatchesPageClient />
    </Suspense>
  );
}
