import type { MatchActionType } from '@prisma/client';
import type { MeMatchItemDto, MeMatchesListResponseDto } from '../../dto/me-matches-response.dto';
import type { MeMatchesParticipantReadModel } from '../../me-profile-engine.mapper';
import type { ProductProfileMatchingBridge } from '../../user-profile-matching-bridge.contract';
import type {
  EvaluationRow,
  LatestEvaluationForMatchRow,
  MatchCandidateListRow,
  ViewerMatchContext,
} from '../../repositories/match.repository.types';
import type { HolyGrailDimensionOutcomeCounts } from '../../../holy-grail-matching/eligibility.evaluator';
import type { DealbreakerTagOutcomeCounts } from '../../../holy-grail-matching/dealbreaker-telemetry';
import type {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../../holy-grail-matching/dealbreaker-signals-text.extract';
import type { PendingHardBlockMatch } from '../match-list-hard-block-pending';
import { resolveMatchListCandidateCap } from '../../match-list-candidate-cap';

export type BuildFullRankedListOptions = {
  candidateCap?: number;
  emitListAnalytics?: boolean;
  candidateProfileIds?: string[];
  deadlineAtMs?: number;
  now?: () => number;
};

export type NormalizedBuildFullRankedListOptions = {
  candidateCap: number;
  emitListAnalytics: boolean;
  candidateProfileIds?: string[];
  isPageHydrate: boolean;
  deadlineAtMs?: number;
  now: () => number;
};

export function normalizeBuildFullRankedListOptions(
  options?: BuildFullRankedListOptions,
): NormalizedBuildFullRankedListOptions {
  const pageIds = options?.candidateProfileIds;
  return {
    candidateCap: options?.candidateCap ?? resolveMatchListCandidateCap(),
    emitListAnalytics: options?.emitListAnalytics !== false,
    candidateProfileIds: pageIds,
    isPageHydrate: pageIds != null,
    deadlineAtMs: options?.deadlineAtMs,
    now: options?.now ?? Date.now,
  };
}

export type RankingViewerReady = {
  userId: string;
  viewer: ViewerMatchContext;
  viewerBridge: ProductProfileMatchingBridge;
  viewerRead: MeMatchesParticipantReadModel;
  viewerEval: EvaluationRow;
  viewerProfileCore: Omit<
    ViewerMatchContext,
    'preference' | 'signals' | 'interests'
  >;
  viewerDealbreakerSignals: ReturnType<
    typeof extractDealbreakerSignalsFromFreeText
  >['signals'];
  viewerSelfHints: ReturnType<typeof extractSelfFactHintsFromFreeText>;
  asOf: Date;
};

export type RankingPoolMeta = {
  isPageHydrate: boolean;
  candidateCap: number;
  totalAnalyzedCandidates: number;
  candidatesEligible: number;
  totalBeforeFilter: number;
  filteredNoPhotoCandidates: number;
  candidateLoadMs: number;
};

export type RankingCandidatePool = RankingPoolMeta & {
  candidateRows: MatchCandidateListRow[];
  latestEvalByProfile: Map<string, LatestEvaluationForMatchRow>;
  actionByTargetUserId: Map<string, MatchActionType>;
  mutualCounterpartUserIds: Set<string>;
  evalQueryMs: number;
  /** Input page ID count when isPageHydrate (for trace line). */
  hydratePageIdCount?: number;
};

export type RankingLoadResult =
  | { kind: 'not_ready'; dto: MeMatchesListResponseDto }
  | { kind: 'early_ready'; dto: MeMatchesListResponseDto }
  | { kind: 'loaded'; viewer: RankingViewerReady; pool: RankingCandidatePool };

export type RankingScoreResult = {
  matches: MeMatchItemDto[];
  pendingHardBlocks: PendingHardBlockMatch[];
  hgDimensionOutcomeCounts: HolyGrailDimensionOutcomeCounts;
  dealbreakerOutcomeCounts: DealbreakerTagOutcomeCounts;
  budgetExceeded: boolean;
  scoreCpuMs: number;
};

export type RankingAssembleResult = {
  dto: MeMatchesListResponseDto;
  matches: MeMatchItemDto[];
};

export type RankingTelemetryInput = {
  userId: string;
  viewer: RankingViewerReady;
  pool: RankingCandidatePool;
  score: RankingScoreResult;
  emitListAnalytics: boolean;
  finalMatchCount: number;
};
