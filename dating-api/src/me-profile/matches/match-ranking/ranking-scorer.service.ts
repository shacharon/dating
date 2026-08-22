import { Inject, Injectable } from '@nestjs/common';
import { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import { ErrorCodes } from '../../../logging/error-codes';
import {
  accumulateHolyGrailDimensionOutcomeCounts,
  emptyHolyGrailDimensionOutcomeCounts,
} from '../../../holy-grail-matching/eligibility.evaluator';
import {
  accumulateDealbreakerOutcomeCounts,
  emptyDealbreakerTagOutcomeCounts,
} from '../../../holy-grail-matching/dealbreaker-telemetry';
import {
  PAIR_MATCH_POLICY,
  type PairMatchPolicy,
} from '../../../matching-policy/pair-match-policy';
import { resolveMatchPrimaryPhotoUrl } from '../../../photo-storage/cdn-url';
import { buildMeMatchesParticipantReadModel } from '../../me-profile-engine.mapper';
import { MatchListCandidateEvaluationMissingError } from '../../me-matches.errors';
import { toMeMatchListItem } from '../../me-matches-response.mapper';
import { buildProductProfileMatchingBridge } from '../../user-profile-matching-bridge.contract';
import { MatchEligibilityService } from '../match-eligibility.service';
import type { PendingHardBlockMatch } from '../match-list-hard-block-pending';
import {
  matchActionToYourAction,
  partnerGenderSourceForMeMatchesRow,
  pickApprovedPrimaryPhotoId,
} from '../match-list.helpers';
import type {
  NormalizedBuildFullRankedListOptions,
  RankingCandidatePool,
  RankingScoreResult,
  RankingViewerReady,
} from './ranking.types';

@Injectable()
export class RankingScorerService {
  constructor(
    private readonly obs: StructuredObservabilityService,
    private readonly eligibility: MatchEligibilityService,
    @Inject(PAIR_MATCH_POLICY) private readonly pairMatchPolicy: PairMatchPolicy,
  ) {}

  score(
    viewer: RankingViewerReady,
    pool: RankingCandidatePool,
    options: Pick<
      NormalizedBuildFullRankedListOptions,
      'deadlineAtMs' | 'now'
    >,
  ): RankingScoreResult {
    const { viewerBridge, viewerRead, asOf } = viewer;
    const {
      candidateRows,
      latestEvalByProfile,
      actionByTargetUserId,
      mutualCounterpartUserIds,
    } = pool;
    const deadlineAtMs = options.deadlineAtMs;
    const nowFn = options.now;

    const scoreCpuStarted = Date.now();
    const matches: RankingScoreResult['matches'] = [];
    const hgDimensionOutcomeCounts = emptyHolyGrailDimensionOutcomeCounts();
    const dealbreakerOutcomeCounts = emptyDealbreakerTagOutcomeCounts();
    const pendingHardBlocks: PendingHardBlockMatch[] = [];
    let budgetExceeded = false;

    for (const row of candidateRows) {
      if (deadlineAtMs != null && nowFn() >= deadlineAtMs) {
        budgetExceeded = true;
        break;
      }

      const candidateBridge = buildProductProfileMatchingBridge(
        {
          ...row,
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
          city: null,
          country: null,
        },
        asOf,
        partnerGenderSourceForMeMatchesRow(row, this.obs),
      );
      const eligible = this.eligibility.passesReciprocalGender(
        viewerBridge.acceptedPartnerGenders,
        viewerBridge.selfGender,
        candidateBridge.acceptedPartnerGenders,
        candidateBridge.selfGender,
      );
      if (!eligible) continue;

      const candidateEval = latestEvalByProfile.get(row.id);
      if (!candidateEval) {
        throw new MatchListCandidateEvaluationMissingError(row.id);
      }

      const {
        preference: candidatePreference,
        signals: candidateSignals = [],
        interests: candidateInterests = [],
        ...candidateProfileCore
      } = row;
      const candidateRead = buildMeMatchesParticipantReadModel(
        {
          ...candidateProfileCore,
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
        },
        candidatePreference ?? null,
        candidateEval,
        { signals: candidateSignals, interests: candidateInterests },
      );
      if (candidateRead.hg.fallback) {
        this.obs.trace(
          `event=hg_preference_fallback_used profileId=${row.id} reason=${candidateRead.hg.fallback.reason}`,
          ErrorCodes.ME_MATCHES_HG_PREF_FALLBACK,
        );
      }

      const evaluated = this.pairMatchPolicy.evaluate({
        viewerHgRow: viewerRead.hg.row,
        candidateHgRow: candidateRead.hg.row,
        viewerEnginePayload: viewerRead.enginePayload,
        candidateEnginePayload: candidateRead.enginePayload,
      });
      const hgDirections = evaluated.gate.hgDirections;
      if (hgDirections !== null) {
        accumulateHolyGrailDimensionOutcomeCounts(
          hgDimensionOutcomeCounts,
          hgDirections.aToB,
        );
        accumulateHolyGrailDimensionOutcomeCounts(
          hgDimensionOutcomeCounts,
          hgDirections.bToA,
        );
        accumulateDealbreakerOutcomeCounts(
          dealbreakerOutcomeCounts,
          hgDirections.aToB,
        );
        accumulateDealbreakerOutcomeCounts(
          dealbreakerOutcomeCounts,
          hgDirections.bToA,
        );
      }

      if (evaluated.gate.isHardFail) {
        const yourAction = matchActionToYourAction(
          actionByTargetUserId.get(row.userId) ?? null,
        );
        if (
          !this.eligibility.shouldAdmitHgHardFailOnList({
            yourAction,
            hasActiveMutual: mutualCounterpartUserIds.has(row.userId),
            rawAction: actionByTargetUserId.get(row.userId) ?? null,
          })
        ) {
          continue;
        }
        const { matchScore, explainability, recommendation } = evaluated.score;
        pendingHardBlocks.push({
          row,
          candidateEval,
          candidateBridge,
          hgDirections: hgDirections!,
          matchScore,
          explainability,
          recommendation,
          candidatePayload: candidateRead.enginePayload,
        });
        continue;
      }

      if (this.eligibility.isBlockedAction(actionByTargetUserId.get(row.userId))) {
        continue;
      }

      const { matchScore, explainability, recommendation } = evaluated.score;
      const approvedPhotos = row.photos ?? [];
      const primaryPhotoId = pickApprovedPrimaryPhotoId(approvedPhotos);
      const primaryStorageKey =
        approvedPhotos.find((p) => p.id === primaryPhotoId)?.storageKey ?? null;

      matches.push(
        toMeMatchListItem({
          id: row.id,
          nickname: row.nickname ?? null,
          gender: candidateBridge.selfGender,
          ageYears: candidateBridge.derivedSelfAgeYears,
          locationLabel: candidateBridge.location.locationLabel,
          analyzedAt: row.analyzedAt ?? null,
          hasEvaluation: row._count.evaluations > 0,
          profileAnalysisStale: row.updatedAt > candidateEval.createdAt,
          primaryPhotoUrl: resolveMatchPrimaryPhotoUrl({
            profileId: row.id,
            photoId: primaryPhotoId,
            storageKey: primaryStorageKey,
          }),
          approvedPhotoCount: approvedPhotos.length,
          yourAction: matchActionToYourAction(
            actionByTargetUserId.get(row.userId) ?? null,
          ),
          score: { matchScore, explainability, recommendation },
          teaser: {
            datingChapter: viewer.viewer.datingChapter,
            viewerAgeYears: viewerBridge.derivedSelfAgeYears,
            viewerPayload: viewerRead.enginePayload,
            candidatePayload: candidateRead.enginePayload,
          },
        }),
      );
    }

    return {
      matches,
      pendingHardBlocks,
      hgDimensionOutcomeCounts,
      dealbreakerOutcomeCounts,
      budgetExceeded,
      scoreCpuMs: Date.now() - scoreCpuStarted,
    };
  }
}
