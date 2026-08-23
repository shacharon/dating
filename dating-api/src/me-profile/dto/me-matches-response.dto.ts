import type { HardBlockedDto } from '../../holy-grail-matching/hard-block-reasons';
import type { MatchExplanationTrait } from '../../matches/explainability/core/match-explanation-traits';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../../matches/engine/match-engine';
import type { MatchTeaserDto } from '../../matches/presentation/match-teaser';

/**
 * Sprint 45 Story 3 — public HTTP response shapes for `GET /api/v1/me/matches`
 * and `GET /api/v1/me/matches/:id`. Engine payloads / HG rows never appear here.
 */

export interface MeMatchItemDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  /** Public display name chosen by the candidate; null when unset. */
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  /** True when at least one `UserProfileEvaluation` row exists for this candidate. */
  hasEvaluation: boolean;
  /** Engine final score (0–100). Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /**
   * Sprint 41 — same as `matchScore` when finite; null when unscored.
   * Presentation alias for triage UI (no algorithm change).
   */
  priorityScore: number | null;
  /** Sprint 41 — HIGH ≥85, GOOD ≥70, OTHER otherwise (incl. null score). */
  priorityTier: 'HIGH' | 'GOOD' | 'OTHER';
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /**
   * Sprint 44 — mode-aware teaser copy for browse cards.
   * Mode from viewer datingChapter / age proxy (Story 5).
   */
  teaser: MatchTeaserDto;
  /** Viewer's action toward this candidate's user, if any. */
  yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  /**
   * Present when this candidate is hard-ineligible but “existing” for the viewer
   * (LIKE and/or ACTIVE MutualMatch). Absent for eligible matches.
   */
  hardBlocked?: HardBlockedDto;
}

export interface MeMatchesListResponseDto {
  status: 'ready' | 'not_ready';
  /**
   * Present when `status = 'not_ready'`.
   * - `no_profile` — viewer has never created a product profile.
   * - `not_analyzed` — profile exists but has not completed analysis yet.
   * - `no_photo` — profile is analyzed but viewer has no approved photo.
   */
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  /** Present when `status = 'ready'`. */
  viewerProfileId?: string;
  viewerGender?: string | null;
  viewerAcceptedPartnerGenders?: string[] | null;
  /**
   * Present when `status = 'ready'`. True when the viewer's profile was saved after
   * their latest `UserProfileEvaluation` (`UserProfile.updatedAt > evaluation.createdAt`).
   */
  viewerProfileAnalysisStale?: boolean;
  /**
   * Photo-eligible analyzed candidates (≥1 APPROVED photo), before gender / HG / block filters.
   * Present when `status = 'ready'`.
   */
  totalCandidatesBeforeFilter?: number;
  /**
   * Analyzed candidates excluded because they have zero APPROVED photos.
   * Present when `status = 'ready'`.
   */
  filteredNoPhotoCandidates?: number;
  matches?: MeMatchItemDto[];
  /** Opaque cursor for the next page (ranked list). Null when no more pages. */
  nextCursor?: string | null;
  /** True when more ranked matches exist after this page. */
  hasMore?: boolean;
  /**
   * Sprint 39 — set when rebuild scoring hit MATCH_LIST_REBUILD_BUDGET_MS.
   * List GET paths do not set this.
   */
  budgetExceeded?: boolean;
}

export interface MeMatchDetailDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  /** Public display name chosen by the candidate; null when unset. */
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  /**
   * Curated analysis headline from the candidate’s read model (`evaluationDisplaySummary`).
   * Parsed only inside `me-profile-engine.mapper` from the latest stored evaluation blob.
   * Raw text fields (aboutMe / aboutPartner / aboutRelationship) are never exposed.
   */
  evaluationSummary: string | null;
  /** Engine final score (0–100). Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  /** Deterministic compatibility traits from `explainability.positiveChips` (detail only). */
  matchExplanationTraits?: MatchExplanationTrait[];
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /**
   * Sprint 44 — mode-aware teaser copy (same builder as list; default first_chapter).
   */
  teaser: MatchTeaserDto;
  /**
   * Sprint 22 — grounded long-form "why you match" narrative (detail only).
   * Omitted on compare guards / unscored pairs. List DTO never includes this.
   */
  matchNarrative?: string;
  /**
   * Present when this candidate is hard-ineligible but “existing” for the viewer
   * (LIKE and/or ACTIVE MutualMatch). Absent for eligible matches.
   */
  hardBlocked?: HardBlockedDto;
}
