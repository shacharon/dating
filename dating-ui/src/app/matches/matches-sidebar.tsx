'use client';

import type { MatchListItem } from '@/lib/matches-api';

type ScoreSortOrder = 'desc' | 'asc';

type MatchesSidebarProps = {
  matchesLoading: boolean;
  matchesError: string | null;
  matchesList: MatchListItem[];
  sortedMatchesList: MatchListItem[];
  selectedMatchId: string | null;
  scoreSortOrder: ScoreSortOrder;
  onToggleScoreSort: () => void;
  onSelectMatch: (matchId: string) => void;
};

export function MatchesSidebar({
  matchesLoading,
  matchesError,
  matchesList,
  sortedMatchesList,
  selectedMatchId,
  scoreSortOrder,
  onToggleScoreSort,
  onSelectMatch,
}: MatchesSidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:w-72">
      <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Recent matches
      </h2>
      {matchesLoading && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
      )}
      {matchesError && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {matchesError}
        </p>
      )}
      {!matchesLoading && matchesList.length === 0 && !matchesError && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No matches yet. Compare two profiles above.
        </p>
      )}
      {!matchesLoading && matchesList.length > 0 && (
        <div className="overflow-hidden rounded border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="p-2 font-medium text-zinc-700 dark:text-zinc-300">
                  A / B
                </th>
                <th
                  role="button"
                  tabIndex={0}
                  onClick={onToggleScoreSort}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onToggleScoreSort();
                    }
                  }}
                  className="p-2 font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
                  aria-sort={scoreSortOrder === 'desc' ? 'descending' : 'ascending'}
                >
                  Score {scoreSortOrder === 'desc' ? '↓' : '↑'}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMatchesList.map((m) => (
                <tr
                  key={m.matchId}
                  onClick={() => onSelectMatch(m.matchId)}
                  className={`cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-100 dark:border-zinc-800 dark:hover:bg-zinc-800 ${
                    selectedMatchId === m.matchId ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                  }`}
                >
                  <td className="p-2 text-zinc-600 dark:text-zinc-400">
                    {m.a.name} / {m.b.name}
                  </td>
                  <td className="p-2 font-medium">{m.finalScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </aside>
  );
}
