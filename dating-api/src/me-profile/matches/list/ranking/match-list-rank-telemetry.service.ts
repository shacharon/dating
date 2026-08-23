import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../../logging/error-codes';
import { StructuredObservabilityService } from '../../../../logging/structured-observability.service';
import {
  recordMatchListCandidateLoadMs,
  recordMatchListCandidatesEligible,
  recordMatchListCandidatesLoaded,
  recordMatchListEvalQueryMs,
  recordMatchListScoreCpuMs,
} from '../../../../observability/custom-metrics';
import {
  countDealbreakerClassificationVolume,
  formatDealbreakerClassificationVolumeForLog,
  formatDealbreakerConfidenceForLog,
  formatDealbreakerOutcomeCountsForLog,
  formatKillSwitchTagsForLog,
} from '../../../../holy-grail-matching/dealbreaker-telemetry';
import { getCachedDealbreakerHardDisabledTags } from '../../../../holy-grail-matching/dealbreaker-guardrails';
import { formatHolyGrailDimensionOutcomeCountsForLog } from '../../../../holy-grail-matching/eligibility.evaluator';
import type { MeMatchesListResponseDto } from '../../../dto/me-matches-response.dto';
import type {
  MatchListRankingContext,
  MatchListScoringResult,
} from './match-list-ranking.types';

@Injectable()
export class MatchListRankTelemetryService {
  constructor(
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  recordListBuild(
    context: MatchListRankingContext,
    scoring: MatchListScoringResult,
    dto: MeMatchesListResponseDto,
  ): void {
    const {
      userId,
      emitListAnalytics,
      isPageHydrate,
      pageIds,
      candidateCap,
      viewer,
      candidateRows,
      totalBeforeFilter,
      candidatesEligible,
      filteredNoPhotoCandidates,
      candidateLoadMs,
      evalQueryMs,
    } = context;
    const {
      matches,
      scoreCpuMs,
      hgDimensionOutcomeCounts,
      dealbreakerOutcomeCounts,
      viewerDealbreakerSignals,
    } = scoring;

    if (!isPageHydrate) {
      recordMatchListCandidatesLoaded(candidateRows.length);
      recordMatchListCandidatesEligible(candidatesEligible);
    }
    recordMatchListCandidateLoadMs(candidateLoadMs);
    recordMatchListEvalQueryMs(evalQueryMs);
    recordMatchListScoreCpuMs(scoreCpuMs);

    this.obs.trace(
      isPageHydrate
        ? `me matches page hydrate profileId=${viewer.id} pageIds=${pageIds!.length} after=${matches.length} candidateLoadMs=${candidateLoadMs} evalQueryMs=${evalQueryMs} scoreCpuMs=${scoreCpuMs}`
        : `me matches list profileId=${viewer.id} before=${totalBeforeFilter} after=${matches.length} filteredNoPhoto=${filteredNoPhotoCandidates} candidatesHydrated=${candidateRows.length} candidatesEligible=${candidatesEligible} cap=${candidateCap} candidateLoadMs=${candidateLoadMs} evalQueryMs=${evalQueryMs} scoreCpuMs=${scoreCpuMs}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );

    this.obs.trace(
      `event=hg_dimension_outcomes profileId=${viewer.id} ${formatHolyGrailDimensionOutcomeCountsForLog(hgDimensionOutcomeCounts)}`,
      ErrorCodes.ME_MATCHES_HG_DIMENSION_OUTCOMES,
    );

    const dealbreakerClassVol = countDealbreakerClassificationVolume(
      viewerDealbreakerSignals,
    );
    this.obs.trace(
      `event=hg_dealbreaker_outcomes profileId=${viewer.id} ${formatDealbreakerOutcomeCountsForLog(dealbreakerOutcomeCounts)} ${formatDealbreakerClassificationVolumeForLog(dealbreakerClassVol)} ${formatDealbreakerConfidenceForLog(viewerDealbreakerSignals)} ${formatKillSwitchTagsForLog(getCachedDealbreakerHardDisabledTags())}`,
      ErrorCodes.ME_MATCHES_HG_DEALBREAKER_OUTCOMES,
    );

    if (emitListAnalytics && dto.status === 'ready') {
      this.analytics.track(userId, ProductAnalyticsEvents.MATCH_LIST_VIEWED, {
        matchCount: matches.length,
        viewerProfileId: viewer.id,
      });
    }
  }
}
