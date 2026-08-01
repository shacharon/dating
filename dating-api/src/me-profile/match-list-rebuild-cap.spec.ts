import {
  MATCH_LIST_REBUILD_CANDIDATE_CAP_DEFAULT,
  MATCH_LIST_REBUILD_CANDIDATE_CAP_ENV,
  resolveMatchListRebuildCandidateCap,
} from './match-list-candidate-cap';

describe('resolveMatchListRebuildCandidateCap', () => {
  it('defaults to 5000 when unset/invalid', () => {
    expect(resolveMatchListRebuildCandidateCap({})).toBe(
      MATCH_LIST_REBUILD_CANDIDATE_CAP_DEFAULT,
    );
    expect(
      resolveMatchListRebuildCandidateCap({
        [MATCH_LIST_REBUILD_CANDIDATE_CAP_ENV]: '0',
      }),
    ).toBe(MATCH_LIST_REBUILD_CANDIDATE_CAP_DEFAULT);
  });

  it('parses positive integers', () => {
    expect(
      resolveMatchListRebuildCandidateCap({
        [MATCH_LIST_REBUILD_CANDIDATE_CAP_ENV]: '7500',
      }),
    ).toBe(7500);
  });
});
