'use client';

import type {
  ConversationFilterType,
  ConversationSortBy,
} from '@/lib/conversation-list-controls';

export type ConversationListFiltersCopy = {
  searchPlaceholder: string;
  searchClear: string;
  searchAria: string;
  filterLabel: string;
  filterAria: string;
  filterAll: string;
  filterUnread: string;
  filterRecent: string;
  sortLabel: string;
  sortAria: string;
  sortRecent: string;
  sortAlphabetical: string;
};

type Props = {
  searchQuery: string;
  filterType: ConversationFilterType;
  sortBy: ConversationSortBy;
  onSearchQueryChange: (value: string) => void;
  onFilterTypeChange: (value: ConversationFilterType) => void;
  onSortByChange: (value: ConversationSortBy) => void;
  copy: ConversationListFiltersCopy;
};

/**
 * Search / filter / sort controls for the conversation list page.
 */
export function ConversationListFilters({
  searchQuery,
  filterType,
  sortBy,
  onSearchQueryChange,
  onFilterTypeChange,
  onSortByChange,
  copy,
}: Props) {
  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      data-testid="conversation-list-filters"
    >
      <div className="relative min-w-0 flex-1">
        <label className="sr-only" htmlFor="conversation-list-search">
          {copy.searchAria}
        </label>
        <input
          id="conversation-list-search"
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchAria}
          data-testid="conversation-list-search"
          className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pe-10 ps-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        {searchQuery.length > 0 && (
          <button
            type="button"
            data-testid="conversation-list-search-clear"
            aria-label={copy.searchClear}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-0.5 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            onClick={() => onSearchQueryChange('')}
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-3 sm:shrink-0">
        <div className="min-w-[8.5rem] flex-1 sm:flex-none">
          <label
            htmlFor="conversation-list-filter"
            className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            {copy.filterLabel}
          </label>
          <select
            id="conversation-list-filter"
            value={filterType}
            aria-label={copy.filterAria}
            data-testid="conversation-list-filter"
            onChange={(e) =>
              onFilterTypeChange(e.target.value as ConversationFilterType)
            }
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="all">{copy.filterAll}</option>
            <option value="unread">{copy.filterUnread}</option>
            <option value="recent">{copy.filterRecent}</option>
          </select>
        </div>

        <div className="min-w-[8.5rem] flex-1 sm:flex-none">
          <label
            htmlFor="conversation-list-sort"
            className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400"
          >
            {copy.sortLabel}
          </label>
          <select
            id="conversation-list-sort"
            value={sortBy}
            aria-label={copy.sortAria}
            data-testid="conversation-list-sort"
            onChange={(e) =>
              onSortByChange(e.target.value as ConversationSortBy)
            }
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="recent">{copy.sortRecent}</option>
            <option value="alphabetical">{copy.sortAlphabetical}</option>
          </select>
        </div>
      </div>
    </div>
  );
}
