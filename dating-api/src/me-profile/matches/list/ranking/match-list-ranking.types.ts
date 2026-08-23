import type { MatchActionType } from '@prisma/client';
import type { UserProfileEvaluation } from '@prisma/client';
import type {
  DealbreakerTagOutcomeCounts,
} from '../../../../holy-grail-matching/dealbreaker-telemetry';
import type {
  HolyGrailDimensionOutcomeCounts,
} from '../../../../holy-grail-matching/eligibility.evaluator';
import type {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../../../holy-grail-matching/dealbreaker-signals-text.extract';
import type { ProductProfileMatchingBridge } from '../../../contracts/user-profile-matching-bridge.contract';
import type { MeMatchItemDto, MeMatchesListResponseDto } from '../../../dto/me-matches-response.dto';
import type { MeMatchesParticipantReadModel } from '../../../profile/me-profile-engine.mapper';
import type { PendingHardBlockMatch } from '../match-list-hard-block-pending';

export type ViewerDealbreakerSignals = ReturnType<
  typeof extractDealbreakerSignalsFromFreeText
>['signals'];
export type ViewerSelfHints = ReturnType<typeof extractSelfFactHintsFromFreeText>;

export type MatchListLoadOptions = {
  candidateCap: number;
  emitListAnalytics: boolean;
  candidateProfileIds?: string[];
};

export type MatchListLoaderResult =
  | { kind: 'not_ready'; dto: MeMatchesListResponseDto }
  | { kind: 'ready_early'; dto: MeMatchesListResponseDto }
  | { kind: 'ready'; context: MatchListRankingContext };

export type MatchListRankingContext = {
  userId: string;
  emitListAnalytics: boolean;
  isPageHydrate: boolean;
  pageIds?: string[];
  candidateCap: number;
  asOf: Date;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewer: any;
  viewerBridge: ProductProfileMatchingBridge;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewerEval: any;
  viewerRead: MeMatchesParticipantReadModel;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewerProfileCore: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidateRows: any[];
  totalBeforeFilter: number;
  totalAnalyzedCandidates: number;
  candidatesEligible: number;
  filteredNoPhotoCandidates: number;
  candidateLoadMs: number;
  evalQueryMs: number;
  latestEvalByProfile: Map<string, UserProfileEvaluation>;
  actionByTargetUserId: Map<string, MatchActionType>;
  mutualCounterpartUserIds: Set<string>;
};

export type MatchListScoreOptions = {
  deadlineAtMs?: number;
  now?: () => number;
};

export type MatchListScoringResult = {
  matches: MeMatchItemDto[];
  pendingHardBlocks: PendingHardBlockMatch[];
  budgetExceeded: boolean;
  scoreCpuMs: number;
  hgDimensionOutcomeCounts: HolyGrailDimensionOutcomeCounts;
  dealbreakerOutcomeCounts: DealbreakerTagOutcomeCounts;
  viewerDealbreakerSignals: ViewerDealbreakerSignals;
  viewerSelfHints: ViewerSelfHints;
};
