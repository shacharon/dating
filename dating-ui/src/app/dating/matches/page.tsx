import { MatchCard } from './match-card';
import {
  mapListItemToCard,
  sortMatchesByScoreDesc,
  type MatchListItemApi,
} from '../_lib/matches-list';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchMatchList(): Promise<MatchListItemApi[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/matches`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Matches request failed: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { ok?: boolean; items?: MatchListItemApi[] };
  if (!data?.ok || !Array.isArray(data.items)) {
    throw new Error('Invalid matches list response');
  }

  return data.items;
}

export default async function MatchesPage() {
  const items = await fetchMatchList();
  const cards = sortMatchesByScoreDesc(items.map(mapListItemToCard));

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Matches
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sorted by compatibility score, highest first. Open a match for full detail.
          </p>
        </header>

        {cards.length === 0 ? (
          <div
            className="rounded-xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900"
            role="status"
          >
            <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
              No matches yet
            </p>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              When the index is built, pairs will appear here.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {cards.map((match) => (
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
