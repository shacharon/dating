import { resolveMatchPrimaryPhotoUrl } from '../../../photo-storage/cdn-url';
import {
  extractDealbreakerSignalsFromFreeText,
  extractSelfFactHintsFromFreeText,
} from '../../../holy-grail-matching/dealbreaker-signals-text.extract';
import type { HardBlockedDto } from '../../../holy-grail-matching/hard-block-reasons';
import type { HolyGrailDirectionalEvaluationResult } from '../../../holy-grail-matching/eligibility.evaluator';
import type { MatchExplanationTrait } from '../../../matches/explainability/core/match-explanation-traits';
import type { ProfileJsonPayload } from '../../../profiles/profiles.types';
import type { MeMatchDetailDto } from '../../dto/me-matches-response.dto';
import type { IMatchQueryRepository } from '../../repositories/match.repository';
import { MutualMatchesService } from '../actions/mutual-matches.service';
import {
  toMeMatchDetail,
  type MeMatchCardScoreFields,
} from '../core/me-matches-response.mapper';
import {
  matchActionToYourAction,
  pickApprovedPrimaryPhotoId,
} from '../list/match-list.helpers';
import { MatchCandidateNotFoundError } from '../support/me-matches.errors';
import type { MatchEligibilityService } from './match-eligibility.service';

/** Verbatim from getById primaryPhotoUrl IIFE */
export function buildCandidatePrimaryPhotoUrl(candidate: {
  id: string;
  photos?: ReadonlyArray<{ id: string; storageKey: string | null }>;
}): string | null {
  const photos = candidate.photos ?? [];
  const photoId = pickApprovedPrimaryPhotoId(photos);
  const storageKey =
    photos.find((p) => p.id === photoId)?.storageKey ?? null;
  return resolveMatchPrimaryPhotoUrl({
    profileId: candidate.id,
    photoId,
    storageKey,
  });
}

type AboutTextFields = {
  aboutMe?: string | null;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
};

/**
 * Verbatim hard-block branch when evaluated.gate.isHardFail.
 * Throws MatchCandidateNotFoundError when gate should hide candidate.
 * Returns HardBlockedDto when existing hard-block allows detail.
 */
export async function resolveDetailHardBlocked(args: {
  matches: IMatchQueryRepository;
  mutualMatches: MutualMatchesService;
  eligibility: MatchEligibilityService;
  userId: string;
  candidateUserId: string;
  hgDirections: {
    aToB: HolyGrailDirectionalEvaluationResult;
    bToA: HolyGrailDirectionalEvaluationResult;
  };
  viewerTextFields: AboutTextFields;
  candidateTextFields: AboutTextFields;
}): Promise<HardBlockedDto> {
  const [actionRow, mutual] = await Promise.all([
    args.matches.findActionByActorTarget(args.userId, args.candidateUserId),
    args.mutualMatches.findActiveByUserPair(
      args.userId,
      args.candidateUserId,
    ),
  ]);
  const yourAction = matchActionToYourAction(actionRow?.action ?? null);
  if (
    !args.eligibility.isExistingHardBlock({
      yourAction,
      hasActiveMutual: mutual != null,
    })
  ) {
    throw new MatchCandidateNotFoundError();
  }
  const hardBlocked = args.eligibility.buildHardBlockedDto(
    args.hgDirections,
    extractDealbreakerSignalsFromFreeText(args.viewerTextFields).signals,
    extractSelfFactHintsFromFreeText(args.viewerTextFields),
    args.candidateTextFields,
  );
  if (hardBlocked === undefined) {
    throw new MatchCandidateNotFoundError();
  }
  return hardBlocked;
}

/**
 * Verbatim toMeMatchDetail({...}) call site — returns MeMatchDetailDto.
 * Uses buildCandidatePrimaryPhotoUrl internally.
 */
export function assembleMeMatchDetail(args: {
  candidate: {
    id: string;
    nickname?: string | null;
    analyzedAt?: Date | null;
    updatedAt: Date;
    photos?: ReadonlyArray<{ id: string; storageKey: string | null }>;
    _count: { evaluations: number };
  };
  viewer: { datingChapter: string | null | undefined };
  candidateBridge: {
    selfGender: string | null;
    derivedSelfAgeYears: number | null;
    location: { locationLabel: string | null };
  };
  viewerBridge: { derivedSelfAgeYears: number | null };
  candidateEval: { createdAt: Date };
  evaluationSummary: string | null;
  score: MeMatchCardScoreFields;
  matchExplanationTraits: MatchExplanationTrait[] | undefined;
  matchNarrative: string | undefined;
  hardBlocked: HardBlockedDto | undefined;
  viewerPayload: ProfileJsonPayload;
  candidatePayload: ProfileJsonPayload;
}): MeMatchDetailDto {
  return toMeMatchDetail({
    id: args.candidate.id,
    nickname: args.candidate.nickname ?? null,
    gender: args.candidateBridge.selfGender,
    ageYears: args.candidateBridge.derivedSelfAgeYears,
    locationLabel: args.candidateBridge.location.locationLabel,
    analyzedAt: args.candidate.analyzedAt ?? null,
    hasEvaluation: args.candidate._count.evaluations > 0,
    evaluationSummary: args.evaluationSummary,
    profileAnalysisStale:
      args.candidate.updatedAt > args.candidateEval.createdAt,
    ...(args.matchExplanationTraits !== undefined && {
      matchExplanationTraits: args.matchExplanationTraits,
    }),
    primaryPhotoUrl: buildCandidatePrimaryPhotoUrl(args.candidate),
    approvedPhotoCount: (args.candidate.photos ?? []).length,
    score: args.score,
    teaser: {
      datingChapter: args.viewer.datingChapter,
      viewerAgeYears: args.viewerBridge.derivedSelfAgeYears,
      viewerPayload: args.viewerPayload,
      candidatePayload: args.candidatePayload,
    },
    ...(args.matchNarrative !== undefined
      ? { matchNarrative: args.matchNarrative }
      : {}),
    ...(args.hardBlocked !== undefined
      ? { hardBlocked: args.hardBlocked }
      : {}),
  });
}
