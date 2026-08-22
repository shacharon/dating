import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '../../../analytics/analytics.service';
import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import { ErrorCodes } from '../../../logging/error-codes';
import { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import {
  recordMatchListCandidateLoadMs,
  recordMatchListCandidatesEligible,
  recordMatchListCandidatesLoaded,
  recordMatchListEvalQueryMs,
  recordMatchListScoreCpuMs,
} from '../../../observability/custom-metrics';
import {
  countDealbreakerClassificationVolume,
  formatDealbreakerClassificationVolumeForLog,
  formatDealbreakerConfidenceForLog,
  formatDealbreakerOutcomeCountsForLog,
  formatKillSwitchTagsForLog,
} from '../../../holy-grail-matching/dealbreaker-telemetry';
import { formatHolyGrailDimensionOutcomeCountsForLog } from '../../../holy-grail-matching/eligibility.evaluator';
import { getCachedDealbreakerHardDisabledTags } from '../../../holy-grail-matching/dealbreaker-guardrails';
import type { RankingTelemetryInput } from './ranking.types';

@Injectable()
export class RankingTelemetryService {
  constructor(
    private readonly obs: StructuredObservabilityService,
    private readonly analytics: AnalyticsService,
  ) {}

  track(input: RankingTelemetryInput): void {
    const { userId, viewer, pool, score, emitListAnalytics, finalMatchCount } =
      input;
    const { isPageHydrate, candidateCap } = pool;

    if (!isPageHydrate) {
      recordMatchListCandidatesLoaded(pool.candidateRows.length);
      recordMatchListCandidatesEligible(pool.candidatesEligible);
    }
    recordMatchListCandidateLoadMs(pool.candidateLoadMs);
    recordMatchListEvalQueryMs(pool.evalQueryMs);
    recordMatchListScoreCpuMs(score.scoreCpuMs);

    this.obs.trace(
      isPageHydrate
        ? `me matches page hydrate profileId=${viewer.viewer.id} pageIds=${pool.hydratePageIdCount ?? pool.candidateRows.length} after=${finalMatchCount} candidateLoadMs=${pool.candidateLoadMs} evalQueryMs=${pool.evalQueryMs} scoreCpuMs=${score.scoreCpuMs}`
        : `me matches list profileId=${viewer.viewer.id} before=${pool.totalBeforeFilter} after=${finalMatchCount} filteredNoPhoto=${pool.filteredNoPhotoCandidates} candidatesHydrated=${pool.candidateRows.length} candidatesEligible=${pool.candidatesEligible} cap=${candidateCap} candidateLoadMs=${pool.candidateLoadMs} evalQueryMs=${pool.evalQueryMs} scoreCpuMs=${score.scoreCpuMs}`,
      ErrorCodes.ME_MATCHES_LIST_OK,
    );

    this.obs.trace(
      `event=hg_dimension_outcomes profileId=${viewer.viewer.id} ${formatHolyGrailDimensionOutcomeCountsForLog(score.hgDimensionOutcomeCounts)}`,
      ErrorCodes.ME_MATCHES_HG_DIMENSION_OUTCOMES,
    );

    const dealbreakerClassVol = countDealbreakerClassificationVolume(
      viewer.viewerDealbreakerSignals,
    );
    this.obs.trace(
      `event=hg_dealbreaker_outcomes profileId=${viewer.viewer.id} ${formatDealbreakerOutcomeCountsForLog(score.dealbreakerOutcomeCounts)} ${formatDealbreakerClassificationVolumeForLog(dealbreakerClassVol)} ${formatDealbreakerConfidenceForLog(viewer.viewerDealbreakerSignals)} ${formatKillSwitchTagsForLog(getCachedDealbreakerHardDisabledTags())}`,
      ErrorCodes.ME_MATCHES_HG_DEALBREAKER_OUTCOMES,
    );

    if (emitListAnalytics) {
      this.analytics.track(userId, ProductAnalyticsEvents.MATCH_LIST_VIEWED, {
        matchCount: finalMatchCount,
        viewerProfileId: viewer.viewer.id,
      });
    }
  }
}
