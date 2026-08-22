/** Chips + one-line reason from the match engine. Null when evaluation is missing. */
export interface MatchExplainabilityDto {
  positiveChips: string[];
  /** Present only when friction >= 3 and a tension driver exists. */
  tensionChip?: string;
  reasonShort: string;
  /** Present when both profiles share at least one interest tag. */
  sharedInterestNote?: string;
  /** Up to 2 shared interest tags for distinct overlap chips. */
  interestOverlapTags?: string[];
}

/** User-facing takeaway from the match engine. Null when evaluation is missing. */
export interface MatchRecommendationDto {
  explainability: MatchExplainabilityDto;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
}

/** Deterministic compatibility trait from `explainability.positiveChips` (detail only). */
export interface MatchExplanationTrait {
  group: string;
  label: string;
  evidence: string;
  strength: 'strong' | 'moderate';
}

/** Sprint 44 — match card teaser mode ids. */
export type TeaserMode = 'first_chapter' | 'ready_again' | 'new_chapter';

/** Sprint 44 — mode-aware teaser payload on list/detail match items. */
export type MatchTeaserDto = {
  mode: TeaserMode;
  lines: string[];
  claim?: string;
  showScore: boolean;
  score: number | null;
  askHint?: string;
};

export type HardBlockDirection = 'viewer_to_them' | 'them_to_viewer';

export type HardBlockReasonDto = {
  code: string;
  dimension: string;
  direction: HardBlockDirection;
  message: string;
  evidence?: {
    viewerQuote?: string;
    counterpartyQuote?: string;
  };
};

export type HardBlockedDto = {
  disabled: true;
  reasons: HardBlockReasonDto[];
};

/** One match candidate from `GET /api/v1/me/matches`. */
export interface MeMatchItemDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  /** Engine final score 0–100. Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /**
   * Sprint 41 — same as `matchScore` when finite; null when unscored.
   */
  priorityScore?: number | null;
  /** Sprint 41 — HIGH ≥85, GOOD ≥70, OTHER otherwise. */
  priorityTier?: 'HIGH' | 'GOOD' | 'OTHER';
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /**
   * Sprint 44 — mode-aware teaser copy for browse cards.
   * Default mode is `first_chapter` until chapter intent is wired.
   */
  teaser?: MatchTeaserDto;
  /** Relative path to primary photo file endpoint; null when absent. */
  primaryPhotoUrl?: string | null;
  yourAction?: 'LIKE' | 'PASS' | 'BLOCK' | null;
  /** Present when hard-ineligible but already Liked / mutual with the viewer. */
  hardBlocked?: HardBlockedDto;
}

/** Full response shape of `GET /api/v1/me/matches`. */
export interface MeMatchesListDto {
  status: 'ready' | 'not_ready';
  /** Present when `status = 'not_ready'`. */
  reason?: 'no_profile' | 'not_analyzed' | 'no_photo';
  viewerProfileId?: string;
  viewerGender?: string | null;
  viewerAcceptedPartnerGenders?: string[] | null;
  /**
   * Present when `status = 'ready'`. True when the viewer profile changed after their latest analysis.
   */
  viewerProfileAnalysisStale?: boolean;
  totalCandidatesBeforeFilter?: number;
  matches?: MeMatchItemDto[];
  nextCursor?: string | null;
  hasMore?: boolean;
}

/** Response shape of `GET /api/v1/me/matches/:id`. */
export interface MeMatchDetailDto {
  /** `UserProfile.id` of the candidate. */
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  /** Curated `display.summary` from the candidate's evaluation; null when absent. */
  evaluationSummary: string | null;
  /** Engine final score 0–100. Null when either profile lacks a valid evaluation. */
  matchScore: number | null;
  /** True when profile text changed after latest analysis (profile.updatedAt > evaluation.createdAt). */
  profileAnalysisStale?: boolean;
  /** Present when engine returned scored explainability with mapped positive chips. */
  matchExplanationTraits?: MatchExplanationTrait[];
  /**
   * Sprint 22 — long-form grounded "why you match" narrative (detail only).
   * Omitted when unscored / absent; list responses never include this field.
   */
  matchNarrative?: string;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** Sprint 44 — mode-aware teaser copy (same builder as list). */
  teaser?: MatchTeaserDto;
  /** Relative path to primary photo file endpoint; null when absent. */
  primaryPhotoUrl?: string | null;
  /** Present when hard-ineligible but already Liked / mutual with the viewer. */
  hardBlocked?: HardBlockedDto;
}

/** Response shape of `POST /api/v1/me/matches/:id/actions`. */
export interface MatchActionDto {
  id: string;
  actorUserId: string;
  targetUserId: string;
  targetProfileIdSnapshot: string;
  action: 'LIKE' | 'PASS' | 'BLOCK';
  createdAt: string;
  mutualMatch: boolean;
  conversationId: string | null;
}

/** Response shape of `GET /api/v1/me/matches/:id/actions`. */
export interface MatchActionStateDto {
  action: 'LIKE' | 'PASS' | 'BLOCK' | null;
  createdAt?: string;
  mutualMatch: boolean;
  conversationId: string | null;
}

/** Response shape of `GET /api/v1/me/matches/:id/feedback`. */
export interface MatchFeedbackStateDto {
  sentiment: 'POSITIVE' | 'NEGATIVE' | null;
}

/** Response shape of `PUT /api/v1/me/matches/:id/feedback`. */
export interface MatchFeedbackDto {
  matchProfileId: string;
  sentiment: 'POSITIVE' | 'NEGATIVE';
  createdAt: string;
  updatedAt: string;
}
