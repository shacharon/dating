import {
  MATCH_LIST_CANDIDATE_CAP_DEFAULT,
  MATCH_LIST_CANDIDATE_CAP_ENV,
  resolveMatchListCandidateCap,
} from './match-list-candidate-cap';

describe('resolveMatchListCandidateCap', () => {
  it('defaults to 1000 when unset or empty', () => {
    expect(resolveMatchListCandidateCap({})).toBe(MATCH_LIST_CANDIDATE_CAP_DEFAULT);
    expect(resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '' })).toBe(
      MATCH_LIST_CANDIDATE_CAP_DEFAULT,
    );
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '  ' }),
    ).toBe(MATCH_LIST_CANDIDATE_CAP_DEFAULT);
  });

  it('defaults to 1000 for 0, negative, or non-finite', () => {
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '0' }),
    ).toBe(MATCH_LIST_CANDIDATE_CAP_DEFAULT);
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '-1' }),
    ).toBe(MATCH_LIST_CANDIDATE_CAP_DEFAULT);
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: 'abc' }),
    ).toBe(MATCH_LIST_CANDIDATE_CAP_DEFAULT);
  });

  it('accepts positive integers', () => {
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '2' }),
    ).toBe(2);
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '1000' }),
    ).toBe(1000);
    expect(
      resolveMatchListCandidateCap({ [MATCH_LIST_CANDIDATE_CAP_ENV]: '2500.9' }),
    ).toBe(2500);
  });
});
