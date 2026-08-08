/**
 * Product view-models for match browse/detail (Sprint 47 Story 1).
 * Components consume these — not raw me-matches wire DTOs.
 */

export type MatchPriorityTier = 'HIGH' | 'GOOD' | 'OTHER';
export type MatchViewerAction = 'LIKE' | 'PASS' | 'BLOCK';
export type MatchTeaserMode = 'first_chapter' | 'ready_again' | 'new_chapter';
export type MatchListNotReadyReason = 'no_profile' | 'not_analyzed' | 'no_photo';
export type HardBlockDirection = 'viewer_to_them' | 'them_to_viewer';

export interface MatchWhyVM {
  positiveChips: string[];
  tensionChip: string | null;
  reasonShort: string;
  sharedInterestNote: string | null;
  interestOverlapTags: string[];
}

export interface MatchRecommendationVM {
  primaryTakeaway: string;
  caution: string | null;
  suggestedNextAction: string;
}

export interface MatchTeaserVM {
  mode: MatchTeaserMode;
  lines: string[];
  claim: string | null;
  showScore: boolean;
  score: number | null;
  askHint: string | null;
}

export interface MatchHardBlockReasonVM {
  code: string;
  dimension: string;
  direction: HardBlockDirection;
  message: string;
  viewerQuote: string | null;
  counterpartyQuote: string | null;
}

export interface MatchHardBlockVM {
  disabled: true;
  reasons: MatchHardBlockReasonVM[];
}

export interface MatchTraitVM {
  group: string;
  label: string;
  evidence: string;
  strength: 'strong' | 'moderate';
}

/** Shared card identity + score + why (list + detail). */
export interface MatchCardCoreVM {
  id: string;
  nickname: string | null;
  gender: string | null;
  ageYears: number | null;
  locationLabel: string | null;
  analyzedAt: string | null;
  hasEvaluation: boolean;
  score: number | null;
  profileAnalysisStale: boolean;
  primaryPhotoUrl: string | null;
  approvedPhotoCount: number;
  why: MatchWhyVM | null;
  recommendation: MatchRecommendationVM | null;
  teaser: MatchTeaserVM | null;
  hardBlock: MatchHardBlockVM | null;
}

export interface MatchListItemVM extends MatchCardCoreVM {
  tier: MatchPriorityTier;
  viewerAction: MatchViewerAction | null;
}

export interface MatchDetailVM extends MatchCardCoreVM {
  summary: string | null;
  traits: MatchTraitVM[];
  narrative: string | null;
}

export interface MatchListReadyVM {
  status: 'ready';
  viewerProfileId: string;
  viewerGender: string | null;
  viewerAcceptedPartnerGenders: string[] | null;
  viewerProfileAnalysisStale: boolean;
  totalCandidatesBeforeFilter: number | null;
  filteredNoPhotoCandidates: number | null;
  budgetExceeded: boolean | null;
  matches: MatchListItemVM[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MatchListNotReadyVM {
  status: 'not_ready';
  reason: MatchListNotReadyReason;
  nextCursor: null;
  hasMore: false;
}

export type MatchListPageVM = MatchListReadyVM | MatchListNotReadyVM;

export interface GroupedPriorityMatchesVM {
  high: MatchListItemVM[];
  good: MatchListItemVM[];
  other: MatchListItemVM[];
  blocked: MatchListItemVM[];
}
