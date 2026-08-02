import {
  MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT,
  MATCH_LIST_REBUILD_BUDGET_MS_ENV,
  resolveMatchListRebuildBudgetMs,
} from './match-list-rebuild-budget';

describe('resolveMatchListRebuildBudgetMs', () => {
  it('defaults to 10000 when unset', () => {
    expect(resolveMatchListRebuildBudgetMs({})).toBe(
      MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT,
    );
  });

  it('rejects invalid values', () => {
    expect(
      resolveMatchListRebuildBudgetMs({
        [MATCH_LIST_REBUILD_BUDGET_MS_ENV]: '0',
      }),
    ).toBe(MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT);
    expect(
      resolveMatchListRebuildBudgetMs({
        [MATCH_LIST_REBUILD_BUDGET_MS_ENV]: 'nope',
      }),
    ).toBe(MATCH_LIST_REBUILD_BUDGET_MS_DEFAULT);
  });

  it('accepts finite positive ms', () => {
    expect(
      resolveMatchListRebuildBudgetMs({
        [MATCH_LIST_REBUILD_BUDGET_MS_ENV]: '2500',
      }),
    ).toBe(2500);
  });
});
