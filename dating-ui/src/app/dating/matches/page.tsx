import { MatchCard } from './match-card';
import type { DatingMatchPreview } from '../_lib/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchMatches(): Promise<DatingMatchPreview[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/matches/top`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch matches:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    return data.matches || [];
  } catch (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
}

export default async function MatchesPage() {
  const matches = await fetchMatches();

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Your matches
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            People we think fit what you shared. Tap a profile to learn more—details
            and chat will open here next.
          </p>
        </header>

        {matches.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
              No matches yet
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Complete your profile to start seeing potential matches.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-5">
            {matches.map((match) => (
              <li key={match.id}>
                <MatchCard match={match} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
