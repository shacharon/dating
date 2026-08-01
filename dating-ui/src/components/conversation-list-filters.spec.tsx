/** @vitest-environment jsdom */
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ConversationListFilters } from './conversation-list-filters';

const copy = {
  searchPlaceholder: 'Search by name…',
  searchClear: 'Clear search',
  searchAria: 'Search conversations by name',
  filterLabel: 'Filter',
  filterAria: 'Filter conversations',
  filterAll: 'All',
  filterUnread: 'Unread',
  filterRecent: 'Recent (24h)',
  sortLabel: 'Sort',
  sortAria: 'Sort conversations',
  sortRecent: 'Recent first',
  sortAlphabetical: 'A–Z',
};

describe('ConversationListFilters', () => {
  it('renders search, filter, and sort controls without emoji chrome', () => {
    const onSearch = vi.fn();
    const onFilter = vi.fn();
    const onSort = vi.fn();

    render(
      <ConversationListFilters
        searchQuery=""
        filterType="all"
        sortBy="recent"
        onSearchQueryChange={onSearch}
        onFilterTypeChange={onFilter}
        onSortByChange={onSort}
        copy={copy}
      />,
    );

    expect(screen.getByTestId('conversation-list-filters').textContent).not.toMatch(
      /🔍/,
    );

    fireEvent.change(screen.getByTestId('conversation-list-search'), {
      target: { value: 'a' },
    });
    expect(onSearch).toHaveBeenCalledWith('a');

    fireEvent.change(screen.getByTestId('conversation-list-filter'), {
      target: { value: 'unread' },
    });
    expect(onFilter).toHaveBeenCalledWith('unread');

    fireEvent.change(screen.getByTestId('conversation-list-sort'), {
      target: { value: 'alphabetical' },
    });
    expect(onSort).toHaveBeenCalledWith('alphabetical');
  });

  it('shows clear control when search is non-empty', () => {
    const onSearch = vi.fn();

    render(
      <ConversationListFilters
        searchQuery="Alex"
        filterType="all"
        sortBy="recent"
        onSearchQueryChange={onSearch}
        onFilterTypeChange={vi.fn()}
        onSortByChange={vi.fn()}
        copy={copy}
      />,
    );

    fireEvent.click(screen.getByTestId('conversation-list-search-clear'));
    expect(onSearch).toHaveBeenCalledWith('');
  });
});
