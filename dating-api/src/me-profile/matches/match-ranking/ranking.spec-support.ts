import type { AnalyticsService } from '../../analytics/analytics.service';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import type { IMatchQueryRepository } from '../../repositories/match.repository';
import {
  emptyHolyGrailDimensionOutcomeCounts,
} from '../../../holy-grail-matching/eligibility.evaluator';
import { emptyDealbreakerTagOutcomeCounts } from '../../../holy-grail-matching/dealbreaker-telemetry';
import {
  defaultLatestEval,
  makePrefRow,
  makeProfileRow,
  S_ANALYZED,
} from '../../me-matches.spec-support';
import { buildMeMatchesParticipantReadModel } from '../../me-profile-engine.mapper';
import { buildProductProfileMatchingBridge } from '../../user-profile-matching-bridge.contract';
import { partnerGenderSourceForMeMatchesRow } from '../match-list.helpers';
import type {
  NormalizedBuildFullRankedListOptions,
  RankingCandidatePool,
  RankingScoreResult,
  RankingViewerReady,
} from './ranking.types';
import { normalizeBuildFullRankedListOptions } from './ranking.types';

export const VIEWER_USER_ID = 'user_viewer';
export const VIEWER_PROFILE_ID = 'prof_viewer';

export function makeObsMock(): jest.Mocked<
  Pick<StructuredObservabilityService, 'trace' | 'error'>
> {
  return { trace: jest.fn(), error: jest.fn() };
}

export function makeAnalyticsMock(): jest.Mocked<Pick<AnalyticsService, 'track'>> {
  return { track: jest.fn() };
}

export function makeMatchQueryRepoMock(): jest.Mocked<IMatchQueryRepository> {
  return {
    findViewerMatchContextByUserId: jest.fn(),
    findViewerWithPreferenceByUserId: jest.fn(),
    findCandidateProfileForDetail: jest.fn(),
    findCandidateProfilesByIdsForList: jest.fn(),
    countAnalyzedCandidatesExcludingUser: jest.fn(),
    countPhotoEligibleCandidates: jest.fn(),
    listPhotoEligibleCandidates: jest.fn(),
    findCandidateProfileForPhotoAccess: jest.fn(),
    findAboutTextByProfileIds: jest.fn(),
    countApprovedPhotosForProfile: jest.fn(),
    findApprovedPrimaryPhoto: jest.fn(),
    findLatestEvaluationForProfile: jest.fn(),
    findLatestEvaluationsForProfileIds: jest.fn(),
    findActionByActorTarget: jest.fn(),
    listActionsByActor: jest.fn(),
    listActionsByActorForTargets: jest.fn(),
    listActiveMutualCounterpartUserIds: jest.fn(),
  };
}

export function makeAnalyzedViewerRow(
  overrides: Parameters<typeof makeProfileRow>[0] = {
    id: VIEWER_PROFILE_ID,
    userId: VIEWER_USER_ID,
  },
) {
  return {
    ...makeProfileRow({
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      preference: makePrefRow({
        profileId: VIEWER_PROFILE_ID,
        acceptedPartnerGenders: ['FEMALE'],
      }),
      ...overrides,
      id: overrides.id ?? VIEWER_PROFILE_ID,
      userId: overrides.userId ?? VIEWER_USER_ID,
    }),
    signals: [],
    interests: [],
  };
}

export function defaultListOptions(
  overrides: Partial<NormalizedBuildFullRankedListOptions> = {},
): NormalizedBuildFullRankedListOptions {
  return {
    ...normalizeBuildFullRankedListOptions(),
    ...overrides,
  };
}

export function makeRankingViewerReady(
  overrides: Partial<RankingViewerReady> = {},
): RankingViewerReady {
  const viewer = makeAnalyzedViewerRow();
  const asOf = new Date('2026-04-01T12:00:00.000Z');
  const obs = makeObsMock();
  const viewerEval = defaultLatestEval(VIEWER_PROFILE_ID);
  const viewerBridge = buildProductProfileMatchingBridge(
    viewer,
    asOf,
    partnerGenderSourceForMeMatchesRow(viewer, obs),
  );
  const {
    preference: viewerPreference,
    signals: viewerSignals = [],
    interests: viewerInterests = [],
    ...viewerProfileCore
  } = viewer;
  const viewerRead = buildMeMatchesParticipantReadModel(
    viewerProfileCore,
    viewerPreference ?? null,
    viewerEval,
    { signals: viewerSignals, interests: viewerInterests },
  );

  return {
    userId: VIEWER_USER_ID,
    viewer,
    viewerBridge,
    viewerRead,
    viewerEval,
    viewerProfileCore,
    viewerDealbreakerSignals: [],
    viewerSelfHints: [],
    asOf,
    ...overrides,
  };
}

export function makeRankingPool(
  overrides: Partial<RankingCandidatePool> = {},
): RankingCandidatePool {
  return {
    isPageHydrate: false,
    candidateCap: 50,
    totalAnalyzedCandidates: 3,
    candidatesEligible: 2,
    totalBeforeFilter: 2,
    filteredNoPhotoCandidates: 1,
    candidateLoadMs: 5,
    candidateRows: [],
    latestEvalByProfile: new Map(),
    actionByTargetUserId: new Map(),
    mutualCounterpartUserIds: new Set(),
    evalQueryMs: 3,
    ...overrides,
  };
}

export function makeEmptyScoreResult(
  overrides: Partial<RankingScoreResult> = {},
): RankingScoreResult {
  return {
    matches: [],
    pendingHardBlocks: [],
    hgDimensionOutcomeCounts: emptyHolyGrailDimensionOutcomeCounts(),
    dealbreakerOutcomeCounts: emptyDealbreakerTagOutcomeCounts(),
    budgetExceeded: false,
    scoreCpuMs: 1,
    ...overrides,
  };
}

export { S_ANALYZED, makeProfileRow, defaultLatestEval };
