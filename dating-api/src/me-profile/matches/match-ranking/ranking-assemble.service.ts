import { Inject, Injectable } from '@nestjs/common';
import { toMeMatchesListReady } from '../../me-matches-response.mapper';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../../repositories/match.repository';
import { MatchEligibilityService } from '../match-eligibility.service';
import { appendPendingHardBlockMatches } from '../match-list-hard-block-pending';
import type {
  NormalizedBuildFullRankedListOptions,
  RankingAssembleResult,
  RankingCandidatePool,
  RankingScoreResult,
  RankingViewerReady,
} from './ranking.types';

@Injectable()
export class RankingAssembleService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matches: IMatchQueryRepository,
    private readonly eligibility: MatchEligibilityService,
  ) {}

  async assemble(
    viewer: RankingViewerReady,
    pool: RankingCandidatePool,
    score: RankingScoreResult,
    options: Pick<
      NormalizedBuildFullRankedListOptions,
      'isPageHydrate'
    >,
  ): Promise<RankingAssembleResult> {
    const { viewerBridge, viewerRead, viewerEval } = viewer;
    const { isPageHydrate } = options;
    const matches = [...score.matches];

    await appendPendingHardBlockMatches({
      matchesRepository: this.matches,
      pendingHardBlocks: score.pendingHardBlocks,
      matches,
      viewerDealbreakerSignals: viewer.viewerDealbreakerSignals,
      viewerSelfHints: viewer.viewerSelfHints,
      buildHardBlockedDto: (hg, signals, hints, text) =>
        this.eligibility.buildHardBlockedDto(hg, signals, hints, text),
      actionByTargetUserId: pool.actionByTargetUserId,
      viewerDatingChapter: viewer.viewer.datingChapter,
      viewerAgeYears: viewerBridge.derivedSelfAgeYears,
      viewerEnginePayload: viewerRead.enginePayload,
    });

    if (!isPageHydrate) {
      matches.sort((a, b) => {
        const aBlocked = a.hardBlocked ? 1 : 0;
        const bBlocked = b.hardBlocked ? 1 : 0;
        if (aBlocked !== bBlocked) return aBlocked - bBlocked;
        const aScore = a.matchScore ?? -1;
        const bScore = b.matchScore ?? -1;
        if (bScore !== aScore) return bScore - aScore;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });
    }

    const dto = toMeMatchesListReady({
      viewerProfileId: viewer.viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      viewerProfileAnalysisStale: viewer.viewer.updatedAt > viewerEval.createdAt,
      ...(isPageHydrate
        ? {}
        : {
            totalCandidatesBeforeFilter: pool.totalBeforeFilter,
            filteredNoPhotoCandidates: pool.filteredNoPhotoCandidates,
          }),
      matches,
      ...(score.budgetExceeded ? { budgetExceeded: true } : {}),
    });

    return { dto, matches };
  }
}
