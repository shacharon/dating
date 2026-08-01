import {
  isMatchListMaterializedEnabled,
  MATCH_LIST_MATERIALIZED_ENV,
} from './match-list-materialized-flag';

describe('isMatchListMaterializedEnabled', () => {
  it('defaults on when unset', () => {
    expect(isMatchListMaterializedEnabled({})).toBe(true);
  });

  it('defaults on when blank', () => {
    expect(
      isMatchListMaterializedEnabled({ [MATCH_LIST_MATERIALIZED_ENV]: '' }),
    ).toBe(true);
    expect(
      isMatchListMaterializedEnabled({ [MATCH_LIST_MATERIALIZED_ENV]: '  ' }),
    ).toBe(true);
  });

  it.each(['1', 'true', 'TRUE', 'yes', 'Yes', 'maybe'])('on for %s', (raw) => {
    expect(
      isMatchListMaterializedEnabled({ [MATCH_LIST_MATERIALIZED_ENV]: raw }),
    ).toBe(true);
  });

  it.each(['0', 'false', 'FALSE', 'no', 'No'])('off for %s', (raw) => {
    expect(
      isMatchListMaterializedEnabled({ [MATCH_LIST_MATERIALIZED_ENV]: raw }),
    ).toBe(false);
  });
});
