import { Inject, Injectable } from '@nestjs/common';
import { ErrorCodes } from '../../../logging/error-codes';
import { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import { buildMeMatchesParticipantReadModel } from '../../profile/me-profile-engine.mapper';
import {
  MatchCandidateNotFoundError,
  MatchDetailEvaluationNotFoundError,
  MatchViewerNotReadyError,
} from '../support/me-matches.errors';
import type { MeMatchDetailDto } from '../../dto/me-matches-response.dto';
import { buildProductProfileMatchingBridge } from '../../contracts/user-profile-matching-bridge.contract';
import { MutualMatchesService } from '../actions/mutual-matches.service';
import { viewerHasApprovedPhoto } from '../../profile/me-profile-photo-gate';
import type { HardBlockedDto } from '../../../holy-grail-matching/hard-block-reasons';
import {
  buildMatchExplanationTraits,
  type MatchExplanationTrait,
} from '../../../matches/explainability/core/match-explanation-traits';
import {
  PAIR_MATCH_POLICY,
  type PairMatchPolicy,
} from '../../../matching-policy/pair-match-policy';
import {
  MatchNarrativeCacheService,
  MatchNarrativeGenerator,
} from '../../../matches/match-narrative';
import { resolveMatchNarrative } from './match-detail-narrative';
import { MatchEligibilityService } from './match-eligibility.service';
import {
  STATUS_ANALYZED,
  assertCandidateHasApprovedPhotosInRow,
  partnerGenderSourceForMeMatchesRow,
} from '../list/match-list.helpers';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../../repositories/match.repository';
import {
  assembleMeMatchDetail,
  resolveDetailHardBlocked,
} from './match-detail-query.helpers';

@Injectable()
export class MatchDetailQueryService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY) private readonly matches: IMatchQueryRepository,
    private readonly obs: StructuredObservabilityService,
    private readonly mutualMatches: MutualMatchesService,
    private readonly matchNarrativeGenerator: MatchNarrativeGenerator,
    private readonly matchNarrativeCache: MatchNarrativeCacheService,
    private readonly eligibility: MatchEligibilityService,
    @Inject(PAIR_MATCH_POLICY) private readonly pairMatchPolicy: PairMatchPolicy,
  ) {}

  async getById(
    userId: string,
    candidateProfileId: string,
  ): Promise<MeMatchDetailDto> {
    // Viewer must have an analyzed profile to retrieve match details.
    const viewer = await this.matches.findViewerMatchContextByUserId(userId);

    if (!viewer || viewer.status !== STATUS_ANALYZED) {
      throw new MatchViewerNotReadyError('not_analyzed');
    }

    if (!(await viewerHasApprovedPhoto(this.matches, viewer.id))) {
      throw new MatchViewerNotReadyError('no_photo');
    }

    const asOf = new Date();
    const viewerBridge = buildProductProfileMatchingBridge(
      viewer,
      asOf,
      partnerGenderSourceForMeMatchesRow(viewer, this.obs),
    );

    // Load candidate by UserProfile.id — never by userId (no foreign-key exposure).
    const candidate = await this.matches.findCandidateProfileForDetail(
      candidateProfileId,
    );

    if (
      !candidate ||
      candidate.status !== STATUS_ANALYZED ||
      candidate.user?.deletedAt != null
    ) {
      throw new MatchCandidateNotFoundError();
    }

    assertCandidateHasApprovedPhotosInRow(candidate);

    const candidateBridge = buildProductProfileMatchingBridge(
      candidate,
      asOf,
      partnerGenderSourceForMeMatchesRow(candidate, this.obs),
    );
    const eligible = this.eligibility.passesReciprocalGender(
      viewerBridge.acceptedPartnerGenders,
      viewerBridge.selfGender,
      candidateBridge.acceptedPartnerGenders,
      candidateBridge.selfGender,
    );

    // Return 404 even when the profile exists but is not eligible — do not leak existence.
    if (!eligible) {
      throw new MatchCandidateNotFoundError();
    }

    const viewerEval =
      await this.matches.findLatestEvaluationForProfile(viewer.id);
    const candidateEval =
      await this.matches.findLatestEvaluationForProfile(candidate.id);
    if (!viewerEval || !candidateEval) {
      throw new MatchDetailEvaluationNotFoundError();
    }

    await this.eligibility.assertViewerHasNotBlockedTarget(userId, candidate.userId);

    const {
      preference: viewerPrefDetail,
      signals: viewerSignalsDetail = [],
      interests: viewerInterestsDetail = [],
      ...viewerCoreDetail
    } = viewer;
    const viewerRead = buildMeMatchesParticipantReadModel(
      viewerCoreDetail,
      viewerPrefDetail ?? null,
      viewerEval,
      {
        signals: viewerSignalsDetail,
        interests: viewerInterestsDetail,
      },
    );
    const {
      preference: candidatePrefDetail,
      signals: candidateSignalsDetail = [],
      interests: candidateInterestsDetail = [],
      ...candidateCoreDetail
    } = candidate;
    const candidateRead = buildMeMatchesParticipantReadModel(
      candidateCoreDetail,
      candidatePrefDetail ?? null,
      candidateEval,
      {
        signals: candidateSignalsDetail,
        interests: candidateInterestsDetail,
      },
    );

    if (viewerRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${viewer.id} reason=${viewerRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }
    if (candidateRead.hg.fallback) {
      this.obs.trace(
        `event=hg_preference_fallback_used profileId=${candidate.id} reason=${candidateRead.hg.fallback.reason}`,
        ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
      );
    }

    // HG gate + legacy rank via PairMatchPolicy (same contract as list).
    const evaluated = this.pairMatchPolicy.evaluate({
      viewerHgRow: viewerRead.hg.row,
      candidateHgRow: candidateRead.hg.row,
      viewerEnginePayload: viewerRead.enginePayload,
      candidateEnginePayload: candidateRead.enginePayload,
    });

    let hardBlocked: HardBlockedDto | undefined;
    if (evaluated.gate.isHardFail) {
      hardBlocked = await resolveDetailHardBlocked({
        matches: this.matches,
        mutualMatches: this.mutualMatches,
        eligibility: this.eligibility,
        userId,
        candidateUserId: candidate.userId,
        hgDirections: evaluated.gate.hgDirections!,
        viewerTextFields: {
          aboutMe: viewerCoreDetail.aboutMe,
          aboutPartner: viewerCoreDetail.aboutPartner,
          aboutRelationship: viewerCoreDetail.aboutRelationship,
        },
        candidateTextFields: {
          aboutMe: candidateCoreDetail.aboutMe,
          aboutPartner: candidateCoreDetail.aboutPartner,
          aboutRelationship: candidateCoreDetail.aboutRelationship,
        },
      });
    }

    const evaluationSummary = candidateRead.evaluationDisplaySummary;

    const { matchScore, explainability, recommendation } = evaluated.score;
    let matchExplanationTraits: MatchExplanationTrait[] | undefined;
    let matchNarrative: string | undefined;
    if (
      !evaluated.score.scoreGuarded &&
      matchScore != null &&
      explainability != null &&
      recommendation != null
    ) {
      const built = buildMatchExplanationTraits(
        explainability.positiveChips,
        matchScore,
      );
      matchExplanationTraits = built.length > 0 ? built : undefined;
      matchNarrative = await resolveMatchNarrative(
        {
          obs: this.obs,
          matchNarrativeGenerator: this.matchNarrativeGenerator,
          matchNarrativeCache: this.matchNarrativeCache,
        },
        {
          viewerProfileId: viewer.id,
          candidateProfileId: candidate.id,
          viewerEvaluationId: viewerEval.id,
          candidateEvaluationId: candidateEval.id,
          finalScore: matchScore,
          explainability,
          recommendation,
          traits: matchExplanationTraits,
          viewerAbout: {
            aboutMe: viewerCoreDetail.aboutMe,
            aboutPartner: viewerCoreDetail.aboutPartner,
            aboutRelationship: viewerCoreDetail.aboutRelationship,
          },
          candidateAbout: {
            aboutMe: candidateCoreDetail.aboutMe,
            aboutPartner: candidateCoreDetail.aboutPartner,
            aboutRelationship: candidateCoreDetail.aboutRelationship,
          },
        },
      );
    }

    this.obs.trace(
      `me matches detail viewerProfileId=${viewer.id} candidateProfileId=${candidate.id}`,
      ErrorCodes.ME_MATCHES_DETAIL_OK,
    );

    return assembleMeMatchDetail({
      candidate,
      viewer,
      candidateBridge,
      viewerBridge,
      candidateEval,
      evaluationSummary,
      score: { matchScore, explainability, recommendation },
      matchExplanationTraits,
      matchNarrative,
      hardBlocked,
      viewerPayload: viewerRead.enginePayload,
      candidatePayload: candidateRead.enginePayload,
    });
  }
}
