import { resolveMatchPrimaryPhotoUrl } from '../../../photo-storage/cdn-url';
import type { MatchActionType } from '@prisma/client';
import type { IMatchRepository } from '../../repositories/match.repository';
import { toMeMatchListItem } from '../core/me-matches-response.mapper';
import type { MeMatchItemDto } from '../../dto/me-matches-response.dto';
import type { HardBlockedDto } from '../../../holy-grail-matching/hard-block-reasons';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../../../matches/engine/match-engine';
import type { HolyGrailDirectionalEvaluationResult } from '../../../holy-grail-matching/eligibility.evaluator';
import type {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../../holy-grail-matching/dealbreaker-signals-text.extract';
import {
  matchActionToYourAction,
  pickApprovedPrimaryPhotoId,
} from './match-list.helpers';

export type PendingHardBlockMatch = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidateEval: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidateBridge: any;
  hgDirections: {
    aToB: HolyGrailDirectionalEvaluationResult;
    bToA: HolyGrailDirectionalEvaluationResult;
  };
  matchScore: number | null;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  candidatePayload: any;
};

type ViewerDealbreakerSignals = ReturnType<
  typeof extractDealbreakerSignalsFromFreeText
>['signals'];
type ViewerSelfHints = ReturnType<typeof extractSelfFactHintsFromFreeText>;

/**
 * Batch-load about* for deferred hard-block candidates and append list items.
 * Extracted from MatchRankingService to keep Nest ranking under LOC cap.
 */
export async function appendPendingHardBlockMatches(args: {
  matchesRepository: Pick<IMatchRepository, 'findAboutTextByProfileIds'>;
  pendingHardBlocks: PendingHardBlockMatch[];
  matches: MeMatchItemDto[];
  viewerDealbreakerSignals: ViewerDealbreakerSignals;
  viewerSelfHints: ViewerSelfHints;
  buildHardBlockedDto: (
    hgDirections: PendingHardBlockMatch['hgDirections'],
    viewerSignals: ViewerDealbreakerSignals,
    viewerSelfHints: ViewerSelfHints,
    candidateText: {
      aboutMe?: string | null;
      aboutPartner?: string | null;
      aboutRelationship?: string | null;
    },
  ) => HardBlockedDto | undefined;
  actionByTargetUserId: Map<string, MatchActionType>;
  viewerDatingChapter: string | null | undefined;
  viewerAgeYears: number | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  viewerEnginePayload: any;
}): Promise<void> {
  const { pendingHardBlocks, matches } = args;
  if (pendingHardBlocks.length === 0) return;

  const aboutRows = await args.matchesRepository.findAboutTextByProfileIds(
    pendingHardBlocks.map((p) => p.row.id),
  );
  const aboutById = new Map(aboutRows.map((r) => [r.id, r]));
  for (const pending of pendingHardBlocks) {
    const about = aboutById.get(pending.row.id);
    const hardBlocked = args.buildHardBlockedDto(
      pending.hgDirections,
      args.viewerDealbreakerSignals,
      args.viewerSelfHints,
      {
        aboutMe: about?.aboutMe ?? null,
        aboutPartner: about?.aboutPartner ?? null,
        aboutRelationship: about?.aboutRelationship ?? null,
      },
    );
    if (hardBlocked === undefined) {
      continue;
    }
    const approvedPhotos = pending.row.photos ?? [];
    const primaryPhotoId = pickApprovedPrimaryPhotoId(approvedPhotos);
    const primaryStorageKey =
      approvedPhotos.find(
        (p: { id: string; storageKey: string | null }) =>
          p.id === primaryPhotoId,
      )?.storageKey ?? null;
    matches.push(
      toMeMatchListItem({
        id: pending.row.id,
        nickname: pending.row.nickname ?? null,
        gender: pending.candidateBridge.selfGender,
        ageYears: pending.candidateBridge.derivedSelfAgeYears,
        locationLabel: pending.candidateBridge.location.locationLabel,
        analyzedAt: pending.row.analyzedAt ?? null,
        hasEvaluation: pending.row._count.evaluations > 0,
        profileAnalysisStale:
          pending.row.updatedAt > pending.candidateEval.createdAt,
        primaryPhotoUrl: resolveMatchPrimaryPhotoUrl({
          profileId: pending.row.id,
          photoId: primaryPhotoId,
          storageKey: primaryStorageKey,
        }),
        approvedPhotoCount: approvedPhotos.length,
        yourAction: matchActionToYourAction(
          args.actionByTargetUserId.get(pending.row.userId) ?? null,
        ),
        hardBlocked,
        score: {
          matchScore: pending.matchScore,
          explainability: pending.explainability,
          recommendation: pending.recommendation,
        },
        teaser: {
          datingChapter: args.viewerDatingChapter ?? null,
          viewerAgeYears: args.viewerAgeYears ?? null,
          viewerPayload: args.viewerEnginePayload,
          candidatePayload: pending.candidatePayload,
        },
      }),
    );
  }
}
