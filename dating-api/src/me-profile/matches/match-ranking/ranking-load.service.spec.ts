import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../logging/error-codes';
import { MatchListViewerEvaluationMissingError } from '../../me-matches.errors';
import { RankingLoadService } from './ranking-load.service';
import {
  defaultListOptions,
  makeAnalyticsMock,
  makeAnalyzedViewerRow,
  makeMatchQueryRepoMock,
  makeObsMock,
  makeProfileRow,
  S_ANALYZED,
  VIEWER_PROFILE_ID,
  VIEWER_USER_ID,
  defaultLatestEval,
} from './ranking.spec-support';

describe('RankingLoadService', () => {
  let matches: ReturnType<typeof makeMatchQueryRepoMock>;
  let obs: ReturnType<typeof makeObsMock>;
  let analytics: ReturnType<typeof makeAnalyticsMock>;
  let service: RankingLoadService;

  beforeEach(() => {
    matches = makeMatchQueryRepoMock();
    obs = makeObsMock();
    analytics = makeAnalyticsMock();
    service = new RankingLoadService(matches, obs, analytics);
  });

  it('returns not_ready when viewer profile is missing', async () => {
    matches.findViewerMatchContextByUserId.mockResolvedValue(null);

    const result = await service.load(VIEWER_USER_ID, defaultListOptions());

    expect(result).toEqual({
      kind: 'not_ready',
      dto: { status: 'not_ready', reason: 'no_profile' },
    });
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('no profile'),
      ErrorCodes.ME_MATCHES_LIST_NOT_READY,
    );
  });

  it('returns not_ready when profile is not analyzed', async () => {
    matches.findViewerMatchContextByUserId.mockResolvedValue(
      makeAnalyzedViewerRow({ status: 'DRAFT' as typeof S_ANALYZED }),
    );

    const result = await service.load(VIEWER_USER_ID, defaultListOptions());

    expect(result).toEqual({
      kind: 'not_ready',
      dto: { status: 'not_ready', reason: 'not_analyzed' },
    });
  });

  it('returns not_ready and tracks photo gate when viewer has no approved photo', async () => {
    matches.findViewerMatchContextByUserId.mockResolvedValue(
      makeAnalyzedViewerRow(),
    );
    matches.countApprovedPhotosForProfile.mockResolvedValue(0);

    const result = await service.load(
      VIEWER_USER_ID,
      defaultListOptions({ emitListAnalytics: true }),
    );

    expect(result).toEqual({
      kind: 'not_ready',
      dto: { status: 'not_ready', reason: 'no_photo' },
    });
    expect(analytics.track).toHaveBeenCalledWith(
      VIEWER_USER_ID,
      ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED,
      { surface: 'match_list' },
    );
  });

  it('skips photo gate analytics when emitListAnalytics is false', async () => {
    matches.findViewerMatchContextByUserId.mockResolvedValue(
      makeAnalyzedViewerRow(),
    );
    matches.countApprovedPhotosForProfile.mockResolvedValue(0);

    await service.load(
      VIEWER_USER_ID,
      defaultListOptions({ emitListAnalytics: false }),
    );

    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('throws when viewer evaluation is missing', async () => {
    matches.findViewerMatchContextByUserId.mockResolvedValue(
      makeAnalyzedViewerRow(),
    );
    matches.countApprovedPhotosForProfile.mockResolvedValue(1);
    matches.findLatestEvaluationForProfile.mockResolvedValue(null);

    await expect(
      service.load(VIEWER_USER_ID, defaultListOptions()),
    ).rejects.toBeInstanceOf(MatchListViewerEvaluationMissingError);
  });

  it('returns early_ready for empty page hydrate', async () => {
    matches.findViewerMatchContextByUserId.mockResolvedValue(
      makeAnalyzedViewerRow(),
    );
    matches.countApprovedPhotosForProfile.mockResolvedValue(1);
    matches.findLatestEvaluationForProfile.mockResolvedValue(
      defaultLatestEval(VIEWER_PROFILE_ID),
    );

    const result = await service.load(
      VIEWER_USER_ID,
      defaultListOptions({
        isPageHydrate: true,
        candidateProfileIds: [],
      }),
    );

    expect(result.kind).toBe('early_ready');
    if (result.kind === 'early_ready') {
      expect(result.dto).toMatchObject({
        status: 'ready',
        viewerProfileId: VIEWER_PROFILE_ID,
        matches: [],
      });
    }
  });

  it('loads candidate pool with meta counts for full list path', async () => {
    const candidate = makeProfileRow({
      id: 'prof_cand',
      userId: 'user_cand',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
    });
    matches.findViewerMatchContextByUserId.mockResolvedValue(
      makeAnalyzedViewerRow(),
    );
    matches.countApprovedPhotosForProfile.mockResolvedValue(1);
    matches.findLatestEvaluationForProfile.mockResolvedValue(
      defaultLatestEval(VIEWER_PROFILE_ID),
    );
    matches.countAnalyzedCandidatesExcludingUser.mockResolvedValue(5);
    matches.countPhotoEligibleCandidates.mockResolvedValue(3);
    matches.listPhotoEligibleCandidates.mockResolvedValue([candidate]);
    matches.findLatestEvaluationsForProfileIds.mockResolvedValue(
      new Map([
        [
          candidate.id,
          {
            profileId: candidate.id,
            evaluationJson: defaultLatestEval(candidate.id).evaluationJson,
            createdAt: defaultLatestEval(candidate.id).createdAt,
            version: 'v1',
          },
        ],
      ]),
    );
    matches.listActionsByActor.mockResolvedValue([]);
    matches.listActiveMutualCounterpartUserIds.mockResolvedValue([]);

    const result = await service.load(VIEWER_USER_ID, defaultListOptions());

    expect(result.kind).toBe('loaded');
    if (result.kind === 'loaded') {
      expect(result.pool).toMatchObject({
        totalAnalyzedCandidates: 5,
        candidatesEligible: 3,
        totalBeforeFilter: 1,
        filteredNoPhotoCandidates: 2,
        candidateRows: [expect.objectContaining({ id: 'prof_cand' })],
      });
    }
  });
});
