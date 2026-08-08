import type { HardBlockedDto } from '../holy-grail-matching/hard-block-reasons';
import type { MatchExplanationTrait } from '../matches/match-explanation-traits';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../matches/match-engine';
import {
  buildDefaultMatchTeaser,
  resolveTeaserMode,
  withTeaserScore,
} from '../matches/match-teaser';
import type { ProfileJsonPayload } from '../profiles/profiles.types';
import { toPriorityFields } from './match-priority';
import type {
  MeMatchDetailDto,
  MeMatchItemDto,
  MeMatchesListResponseDto,
} from './dto/me-matches-response.dto';

/** Inputs are already eligibility-filtered / scored by the service. */
export type MeMatchCardScoreFields = {
  matchScore: number | null;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
};

export type MeMatchTeaserBuildInput = {
  datingChapter: string | null | undefined;
  viewerAgeYears: number | null;
  viewerPayload: ProfileJsonPayload;
  candidatePayload: ProfileJsonPayload;
};

function trimNickname(nickname: string | null | undefined): string | null {
  const t = nickname?.trim();
  return t ? t : null;
}

function toAnalyzedAtIso(
  analyzedAt: Date | string | null | undefined,
): string | null {
  if (analyzedAt == null) return null;
  if (typeof analyzedAt === 'string') return analyzedAt;
  return analyzedAt.toISOString();
}

export function toMeMatchListItem(input: {
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: Date | string | null;
  hasEvaluation: boolean;
  profileAnalysisStale?: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  hardBlocked?: HardBlockedDto;
  score: MeMatchCardScoreFields;
  teaser: MeMatchTeaserBuildInput;
}): MeMatchItemDto {
  const priority = toPriorityFields(input.score.matchScore);
  const item: MeMatchItemDto = {
    id: input.id,
    nickname: trimNickname(input.nickname),
    gender: input.gender,
    ageYears: input.ageYears,
    locationLabel: input.locationLabel,
    analyzedAt: toAnalyzedAtIso(input.analyzedAt),
    hasEvaluation: input.hasEvaluation,
    matchScore: input.score.matchScore,
    ...priority,
    primaryPhotoUrl: input.primaryPhotoUrl,
    approvedPhotoCount: input.approvedPhotoCount,
    explainability: input.score.explainability,
    recommendation: input.score.recommendation,
    teaser: buildDefaultMatchTeaser(
      {
        score: input.score.matchScore,
        priorityTier: priority.priorityTier,
        explainability: input.score.explainability,
        recommendation: input.score.recommendation,
        viewerPayload: input.teaser.viewerPayload,
        candidatePayload: input.teaser.candidatePayload,
      },
      {
        datingChapter: input.teaser.datingChapter,
        ageYears: input.teaser.viewerAgeYears,
      },
    ),
    yourAction: input.yourAction,
  };
  if (input.profileAnalysisStale !== undefined) {
    item.profileAnalysisStale = input.profileAnalysisStale;
  }
  if (input.hardBlocked !== undefined) {
    item.hardBlocked = input.hardBlocked;
  }
  return item;
}

export function toMeMatchDetail(input: {
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: Date | string | null;
  hasEvaluation: boolean;
  evaluationSummary: string | null;
  profileAnalysisStale?: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  matchExplanationTraits?: MatchExplanationTrait[];
  matchNarrative?: string;
  hardBlocked?: HardBlockedDto;
  score: MeMatchCardScoreFields;
  teaser: MeMatchTeaserBuildInput;
}): MeMatchDetailDto {
  const priority = toPriorityFields(input.score.matchScore);
  const detail: MeMatchDetailDto = {
    id: input.id,
    nickname: trimNickname(input.nickname),
    gender: input.gender,
    ageYears: input.ageYears,
    locationLabel: input.locationLabel,
    analyzedAt: toAnalyzedAtIso(input.analyzedAt),
    hasEvaluation: input.hasEvaluation,
    evaluationSummary: input.evaluationSummary,
    matchScore: input.score.matchScore,
    primaryPhotoUrl: input.primaryPhotoUrl,
    approvedPhotoCount: input.approvedPhotoCount,
    explainability: input.score.explainability,
    recommendation: input.score.recommendation,
    teaser: buildDefaultMatchTeaser(
      {
        score: input.score.matchScore,
        priorityTier: priority.priorityTier,
        explainability: input.score.explainability,
        recommendation: input.score.recommendation,
        viewerPayload: input.teaser.viewerPayload,
        candidatePayload: input.teaser.candidatePayload,
      },
      {
        datingChapter: input.teaser.datingChapter,
        ageYears: input.teaser.viewerAgeYears,
      },
    ),
  };
  if (input.profileAnalysisStale !== undefined) {
    detail.profileAnalysisStale = input.profileAnalysisStale;
  }
  if (input.matchExplanationTraits !== undefined) {
    detail.matchExplanationTraits = input.matchExplanationTraits;
  }
  if (input.matchNarrative !== undefined) {
    detail.matchNarrative = input.matchNarrative;
  }
  if (input.hardBlocked !== undefined) {
    detail.hardBlocked = input.hardBlocked;
  }
  return detail;
}

export function toMeMatchesListNotReady(
  reason: 'no_profile' | 'not_analyzed' | 'no_photo',
): MeMatchesListResponseDto {
  return {
    status: 'not_ready',
    reason,
    nextCursor: null,
    hasMore: false,
  };
}

export function toMeMatchesListReady(input: {
  viewerProfileId: string;
  viewerGender: string | null;
  viewerAcceptedPartnerGenders: string[] | null;
  viewerProfileAnalysisStale: boolean;
  matches: MeMatchItemDto[];
  nextCursor?: string | null;
  hasMore?: boolean;
  totalCandidatesBeforeFilter?: number;
  filteredNoPhotoCandidates?: number;
  budgetExceeded?: boolean;
}): MeMatchesListResponseDto {
  const out: MeMatchesListResponseDto = {
    status: 'ready',
    viewerProfileId: input.viewerProfileId,
    viewerGender: input.viewerGender,
    viewerAcceptedPartnerGenders: input.viewerAcceptedPartnerGenders,
    viewerProfileAnalysisStale: input.viewerProfileAnalysisStale,
    matches: input.matches,
  };
  if (input.nextCursor !== undefined) {
    out.nextCursor = input.nextCursor;
  }
  if (input.hasMore !== undefined) {
    out.hasMore = input.hasMore;
  }
  if (input.totalCandidatesBeforeFilter !== undefined) {
    out.totalCandidatesBeforeFilter = input.totalCandidatesBeforeFilter;
  }
  if (input.filteredNoPhotoCandidates !== undefined) {
    out.filteredNoPhotoCandidates = input.filteredNoPhotoCandidates;
  }
  if (input.budgetExceeded) {
    out.budgetExceeded = true;
  }
  return out;
}

/**
 * Materialized list: hydrate already built a list item; rank score/tier/teaser are SoT.
 */
export function rebaseMeMatchListItemScore(
  item: MeMatchItemDto,
  matchScore: number | null,
  viewerTeaserCtx: {
    datingChapter?: string | null;
    ageYears?: number | null;
  },
): MeMatchItemDto {
  const priority = toPriorityFields(matchScore);
  const viewerMode = resolveTeaserMode(viewerTeaserCtx);
  const teaser =
    item.teaser && item.teaser.mode === viewerMode
      ? withTeaserScore(item.teaser, matchScore)
      : buildDefaultMatchTeaser(
          {
            score: matchScore,
            priorityTier: priority.priorityTier,
            explainability: item.explainability,
            recommendation: item.recommendation,
          },
          viewerTeaserCtx,
        );
  return {
    ...item,
    matchScore,
    ...priority,
    teaser,
  };
}
