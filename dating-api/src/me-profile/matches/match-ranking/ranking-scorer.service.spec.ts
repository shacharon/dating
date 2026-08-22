import { MatchListCandidateEvaluationMissingError } from '../../me-matches.errors';
import { HgGateLegacyRankPolicy } from '../../../matching-policy/hg-gate-legacy-rank.policy';
import { MatchEligibilityService } from '../match-eligibility.service';
import { RankingScorerService } from './ranking-scorer.service';
import {
  defaultLatestEval,
  defaultListOptions,
  makeMatchQueryRepoMock,
  makeObsMock,
  makeProfileRow,
  makeRankingPool,
  makeRankingViewerReady,
} from './ranking.spec-support';

describe('RankingScorerService', () => {
  let obs: ReturnType<typeof makeObsMock>;
  let eligibility: jest.Mocked<
    Pick<
      MatchEligibilityService,
      | 'passesReciprocalGender'
      | 'shouldAdmitHgHardFailOnList'
      | 'isBlockedAction'
    >
  >;
  let service: RankingScorerService;

  beforeEach(() => {
    obs = makeObsMock();
    eligibility = {
      passesReciprocalGender: jest.fn().mockReturnValue(true),
      shouldAdmitHgHardFailOnList: jest.fn().mockReturnValue(true),
      isBlockedAction: jest.fn().mockReturnValue(false),
    };
    service = new RankingScorerService(
      obs,
      eligibility as unknown as MatchEligibilityService,
      new HgGateLegacyRankPolicy(),
    );
  });

  it('skips candidates that fail reciprocal gender', () => {
    eligibility.passesReciprocalGender.mockReturnValue(false);
    const candidate = makeProfileRow({
      id: 'prof_cand',
      userId: 'user_cand',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
    });
    const evalRow = defaultLatestEval(candidate.id);

    const result = service.score(
      makeRankingViewerReady(),
      makeRankingPool({
        candidateRows: [candidate],
        latestEvalByProfile: new Map([
          [
            candidate.id,
            {
              profileId: candidate.id,
              evaluationJson: evalRow.evaluationJson,
              createdAt: evalRow.createdAt,
              version: evalRow.version,
            },
          ],
        ]),
      }),
      defaultListOptions(),
    );

    expect(result.matches).toHaveLength(0);
    expect(eligibility.passesReciprocalGender).toHaveBeenCalled();
  });

  it('skips candidates with blocked actions', () => {
    const candidate = makeProfileRow({
      id: 'prof_cand',
      userId: 'user_cand',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
    });
    const evalRow = defaultLatestEval(candidate.id);
    eligibility.isBlockedAction.mockReturnValue(true);

    const result = service.score(
      makeRankingViewerReady(),
      makeRankingPool({
        candidateRows: [candidate],
        latestEvalByProfile: new Map([
          [
            candidate.id,
            {
              profileId: candidate.id,
              evaluationJson: evalRow.evaluationJson,
              createdAt: evalRow.createdAt,
              version: evalRow.version,
            },
          ],
        ]),
        actionByTargetUserId: new Map([[candidate.userId, 'BLOCK']]),
      }),
      defaultListOptions(),
    );

    expect(result.matches).toHaveLength(0);
  });

  it('throws when candidate evaluation is missing', () => {
    const candidate = makeProfileRow({
      id: 'prof_cand',
      userId: 'user_cand',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
    });

    expect(() =>
      service.score(
        makeRankingViewerReady(),
        makeRankingPool({
          candidateRows: [candidate],
          latestEvalByProfile: new Map(),
        }),
        defaultListOptions(),
      ),
    ).toThrow(MatchListCandidateEvaluationMissingError);
  });

  it('sets budgetExceeded when deadline is reached mid-loop', () => {
    const candidates = [
      makeProfileRow({
        id: 'prof_a',
        userId: 'user_a',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      }),
      makeProfileRow({
        id: 'prof_b',
        userId: 'user_b',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      }),
    ];
    const latestEvalByProfile = new Map(
      candidates.map((c) => {
        const evalRow = defaultLatestEval(c.id);
        return [
          c.id,
          {
            profileId: c.id,
            evaluationJson: evalRow.evaluationJson,
            createdAt: evalRow.createdAt,
            version: evalRow.version,
          },
        ] as const;
      }),
    );
    let calls = 0;
    const now = () => {
      calls += 1;
      return calls >= 2 ? 100 : 0;
    };

    const result = service.score(
      makeRankingViewerReady(),
      makeRankingPool({ candidateRows: candidates, latestEvalByProfile }),
      { deadlineAtMs: 50, now },
    );

    expect(result.budgetExceeded).toBe(true);
  });

  it('scores an eligible candidate into matches', () => {
    const candidate = makeProfileRow({
      id: 'prof_cand',
      userId: 'user_cand',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
    });
    const evalRow = defaultLatestEval(candidate.id);

    const result = service.score(
      makeRankingViewerReady(),
      makeRankingPool({
        candidateRows: [candidate],
        latestEvalByProfile: new Map([
          [
            candidate.id,
            {
              profileId: candidate.id,
              evaluationJson: evalRow.evaluationJson,
              createdAt: evalRow.createdAt,
              version: evalRow.version,
            },
          ],
        ]),
      }),
      defaultListOptions(),
    );

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.id).toBe(candidate.id);
    expect(result.matches[0]?.matchScore).not.toBeNull();
  });
});
