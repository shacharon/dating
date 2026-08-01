import {
  isMatchListMaterializedEnabled,
  MATCH_LIST_MATERIALIZED_ENV,
} from './match-list-materialized-flag';

describe('isMatchListMaterializedEnabled', () => {
  it('defaults off when unset', () => {
    expect(isMatchListMaterializedEnabled({})).toBe(false);
  });

  it.each(['1', 'true', 'TRUE', 'yes', 'Yes'])('on for %s', (raw) => {
    expect(
      isMatchListMaterializedEnabled({ [MATCH_LIST_MATERIALIZED_ENV]: raw }),
    ).toBe(true);
  });

  it.each(['0', 'false', 'no', '', 'maybe'])('off for %s', (raw) => {
    expect(
      isMatchListMaterializedEnabled({ [MATCH_LIST_MATERIALIZED_ENV]: raw }),
    ).toBe(false);
  });
});
