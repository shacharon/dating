import { Inject, Injectable } from '@nestjs/common';
import { MatchActionType } from '@prisma/client';
import {
  buildHardBlockReasons,
  isExistingHardBlockCandidate,
  toHardBlockedDto,
  type HardBlockedDto,
} from '../../holy-grail-matching/hard-block-reasons';
import type { HolyGrailDirectionalEvaluationResult } from '../../holy-grail-matching/eligibility.evaluator';
import {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../holy-grail-matching/dealbreaker-signals-text.extract';
import { evaluateHolyGrailPairDirections } from '../../matches/holy-grail-pair-directions';
import { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  MatchCandidateNotFoundError,
  MatchDetailEvaluationNotFoundError,
  MatchViewerNotReadyError,
} from '../me-matches.errors';
import { viewerHasApprovedPhoto } from '../me-profile-photo-gate';
import {
  buildProductProfileMatchingBridge,
  reciprocalProductGenderEligibility,
} from '../user-profile-matching-bridge.contract';
import {
  STATUS_ANALYZED,
  assertCandidateHasApprovedPhotosInRow,
  partnerGenderSourceForMeMatchesRow,
} from './match-list.helpers';
import {
  MATCH_QUERY_REPOSITORY,
  type IMatchQueryRepository,
} from '../repositories/match.repository';

@Injectable()
export class MatchEligibilityService {
  constructor(
    @Inject(MATCH_QUERY_REPOSITORY) private readonly matches: IMatchQueryRepository,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async assertMatchCandidateVisible(
    viewerUserId: string,
    candidateProfileId: string,
  ): Promise<{ candidateProfileId: string; targetUserId: string }> {
    const viewer =
      await this.matches.findViewerMatchContextByUserId(viewerUserId);

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
    const eligible = reciprocalProductGenderEligibility(
      viewerBridge.acceptedPartnerGenders,
      viewerBridge.selfGender,
      candidateBridge.acceptedPartnerGenders,
      candidateBridge.selfGender,
    );

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

    await this.assertViewerHasNotBlockedTarget(viewerUserId, candidate.userId);

    return {
      candidateProfileId: candidate.id,
      targetUserId: candidate.userId,
    };
  }

  async assertViewerHasNotBlockedTarget(
    viewerUserId: string,
    targetUserId: string,
  ): Promise<void> {
    const row = await this.matches.findActionByActorTarget(
      viewerUserId,
      targetUserId,
    );
    if (row?.action === MatchActionType.BLOCK) {
      throw new MatchCandidateNotFoundError();
    }
  }

  buildHardBlockedDto(
    hgDirections: {
      aToB: HolyGrailDirectionalEvaluationResult;
      bToA: HolyGrailDirectionalEvaluationResult;
    },
    viewerSignals: ReturnType<
      typeof extractDealbreakerSignalsFromFreeText
    >['signals'],
    viewerSelfHints: ReturnType<typeof extractSelfFactHintsFromFreeText>,
    candidateText: {
      aboutMe?: string | null;
      aboutPartner?: string | null;
      aboutRelationship?: string | null;
    },
  ): HardBlockedDto | undefined {
    const counterpartySignals =
      extractDealbreakerSignalsFromFreeText(candidateText).signals;
    const counterpartySelfHints =
      extractSelfFactHintsFromFreeText(candidateText);
    return toHardBlockedDto(
      buildHardBlockReasons({
        aToB: hgDirections.aToB,
        bToA: hgDirections.bToA,
        viewerSignals,
        counterpartySignals,
        viewerSelfHints,
        counterpartySelfHints,
      }),
    );
  }

  /** Pair gate: reciprocal gender for list/detail. */
  passesReciprocalGender(
    ...args: Parameters<typeof reciprocalProductGenderEligibility>
  ): boolean {
    return reciprocalProductGenderEligibility(...args);
  }

  /** HG Layer-3: both rows structured AND either direction FAIL. */
  isHgPairHardFail(
    hgDirections: ReturnType<typeof evaluateHolyGrailPairDirections>,
  ): boolean {
    return (
      hgDirections !== null &&
      (hgDirections.aToB.overallHardEligibility === 'FAIL' ||
        hgDirections.bToA.overallHardEligibility === 'FAIL')
    );
  }

  /**
   * List rebuild: keep existing hard-block candidates; exclude others + BLOCK.
   * Returns false → skip candidate.
   */
  shouldAdmitHgHardFailOnList(args: {
    yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
    hasActiveMutual: boolean;
    rawAction: MatchActionType | null | undefined;
  }): boolean {
    if (
      !isExistingHardBlockCandidate({
        yourAction: args.yourAction,
        hasActiveMutual: args.hasActiveMutual,
      })
    ) {
      return false;
    }
    if (args.rawAction === MatchActionType.BLOCK) {
      return false;
    }
    return true;
  }

  isBlockedAction(action: MatchActionType | null | undefined): boolean {
    return action === MatchActionType.BLOCK;
  }

  /** Detail: existing hard-block admission (throws not used — caller throws). */
  isExistingHardBlock(args: {
    yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
    hasActiveMutual: boolean;
  }): boolean {
    return isExistingHardBlockCandidate(args);
  }
}
