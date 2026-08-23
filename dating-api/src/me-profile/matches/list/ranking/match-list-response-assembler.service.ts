import { Inject, Injectable } from '@nestjs/common';
import { toMeMatchesListReady } from '../../core/me-matches-response.mapper';
import type { MeMatchesListResponseDto } from '../../../dto/me-matches-response.dto';
import { MatchEligibilityService } from '../../detail/match-eligibility.service';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../../../repositories/match.repository';
import { appendPendingHardBlockMatches } from '../match-list-hard-block-pending';
import type {
  MatchListRankingContext,
  MatchListScoringResult,
} from './match-list-ranking.types';

@Injectable()
export class MatchListResponseAssemblerService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY)
    private readonly matchesRepository: IMatchQueryRepository,
    private readonly eligibility: MatchEligibilityService,
  ) {}

  async assembleResponse(
    context: MatchListRankingContext,
    scoring: MatchListScoringResult,
  ): Promise<MeMatchesListResponseDto> {
    const {
      viewer,
      viewerBridge,
      viewerEval,
      viewerRead,
      isPageHydrate,
      totalBeforeFilter,
      filteredNoPhotoCandidates,
      actionByTargetUserId,
    } = context;
    const { matches, pendingHardBlocks, budgetExceeded, viewerDealbreakerSignals, viewerSelfHints } =
      scoring;

    await appendPendingHardBlockMatches({
      matchesRepository: this.matchesRepository,
      pendingHardBlocks,
      matches,
      viewerDealbreakerSignals,
      viewerSelfHints,
      buildHardBlockedDto: (hg, signals, hints, text) =>
        this.eligibility.buildHardBlockedDto(hg, signals, hints, text),
      actionByTargetUserId,
      viewerDatingChapter: viewer.datingChapter,
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

    return toMeMatchesListReady({
      viewerProfileId: viewer.id,
      viewerGender: viewerBridge.selfGender,
      viewerAcceptedPartnerGenders: viewerBridge.acceptedPartnerGenders
        ? [...viewerBridge.acceptedPartnerGenders]
        : null,
      viewerProfileAnalysisStale: viewer.updatedAt > viewerEval.createdAt,
      ...(isPageHydrate
        ? {}
        : {
            totalCandidatesBeforeFilter: totalBeforeFilter,
            filteredNoPhotoCandidates,
          }),
      matches,
      ...(budgetExceeded ? { budgetExceeded: true } : {}),
    });
  }
}
