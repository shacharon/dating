import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../logging/error-codes';
import * as customMetrics from '../../../observability/custom-metrics';
import { RankingTelemetryService } from './ranking-telemetry.service';
import {
  makeAnalyticsMock,
  makeEmptyScoreResult,
  makeObsMock,
  makeRankingPool,
  makeRankingViewerReady,
} from './ranking.spec-support';

describe('RankingTelemetryService', () => {
  let obs: ReturnType<typeof makeObsMock>;
  let analytics: ReturnType<typeof makeAnalyticsMock>;
  let service: RankingTelemetryService;

  beforeEach(() => {
    obs = makeObsMock();
    analytics = makeAnalyticsMock();
    service = new RankingTelemetryService(obs, analytics);
    jest.spyOn(customMetrics, 'recordMatchListCandidatesLoaded').mockImplementation();
    jest.spyOn(customMetrics, 'recordMatchListCandidatesEligible').mockImplementation();
    jest.spyOn(customMetrics, 'recordMatchListCandidateLoadMs').mockImplementation();
    jest.spyOn(customMetrics, 'recordMatchListEvalQueryMs').mockImplementation();
    jest.spyOn(customMetrics, 'recordMatchListScoreCpuMs').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('records list metrics and MATCH_LIST_VIEWED when emitListAnalytics is true', () => {
    const viewer = makeRankingViewerReady();
    const pool = makeRankingPool({ candidateRows: [{ id: 'x' } as never] });
    const score = makeEmptyScoreResult();

    service.track({
      userId: viewer.userId,
      viewer,
      pool,
      score,
      emitListAnalytics: true,
      finalMatchCount: 2,
    });

    expect(customMetrics.recordMatchListCandidatesLoaded).toHaveBeenCalledWith(1);
    expect(customMetrics.recordMatchListCandidatesEligible).toHaveBeenCalledWith(2);
    expect(analytics.track).toHaveBeenCalledWith(
      viewer.userId,
      ProductAnalyticsEvents.MATCH_LIST_VIEWED,
      expect.objectContaining({ matchCount: 2 }),
    );
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('me matches list'),
      ErrorCodes.ME_MATCHES_LIST_OK,
    );
  });

  it('skips MATCH_LIST_VIEWED when emitListAnalytics is false', () => {
    service.track({
      userId: 'user_x',
      viewer: makeRankingViewerReady(),
      pool: makeRankingPool(),
      score: makeEmptyScoreResult(),
      emitListAnalytics: false,
      finalMatchCount: 0,
    });

    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('uses hydrate page id count in page hydrate trace', () => {
    service.track({
      userId: 'user_x',
      viewer: makeRankingViewerReady(),
      pool: makeRankingPool({
        isPageHydrate: true,
        hydratePageIdCount: 5,
        candidateRows: [{ id: 'a' } as never, { id: 'b' } as never],
      }),
      score: makeEmptyScoreResult(),
      emitListAnalytics: false,
      finalMatchCount: 2,
    });

    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('pageIds=5'),
      ErrorCodes.ME_MATCHES_LIST_OK,
    );
    expect(customMetrics.recordMatchListCandidatesLoaded).not.toHaveBeenCalled();
  });
});
