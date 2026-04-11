import Link from 'next/link';
import { MatchCard } from './match-card';
import {
  HIDE_CHILDREN_UNSURE_QUERY_PARAM,
  parseHideChildrenUnsure,
} from '../_lib/children-unsure';
import {
  mapListItemToCard,
  sortMatchesByScoreDesc,
  type MatchListItemApi,
} from '../_lib/matches-list';
import { getApiBase } from '@/lib/api-base';

async function fetchMatchList(hideChildrenUnsure: boolean): Promise<MatchListItemApi[]> {
  const qs = hideChildrenUnsure ? `?${HIDE_CHILDREN_UNSURE_QUERY_PARAM}=true` : '';
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/matches${qs}`, {
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

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MatchesPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const rawHide = sp[HIDE_CHILDREN_UNSURE_QUERY_PARAM];
  const hideChildrenUnsure = parseHideChildrenUnsure(
    typeof rawHide === 'string' ? rawHide : undefined,
  );
  const items = await fetchMatchList(hideChildrenUnsure);
  const cards = sortMatchesByScoreDesc(items.map(mapListItemToCard));

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            Matches
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Sorted by compatibility score (legacy ranking only). Kids-intent uncertainty does not change order; use
            filters to hide those matches if you prefer. Open a match for full detail.
          </p>
          <nav className="mt-4 flex flex-wrap gap-2 text-sm" aria-label="Match filters">
            <Link
              href="/dating/matches"
              className={`rounded-lg px-3 py-1.5 font-medium ${
                !hideChildrenUnsure
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              Show all
            </Link>
            <Link
              href={`/dating/matches?${HIDE_CHILDREN_UNSURE_QUERY_PARAM}=true`}
              className={`rounded-lg px-3 py-1.5 font-medium ${
                hideChildrenUnsure
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800'
              }`}
            >
              Hide kids-unsure pairs
            </Link>
          </nav>
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
