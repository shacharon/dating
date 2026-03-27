/**
 * Shared /dating mock contracts. Shape names mirror likely API DTOs later.
 */

/** Mirrors `MatchExplainabilityDto` from dating-api match engine (strict FE contract). */
export interface MatchExplainabilityDto {
  positiveChips: string[];
  tensionChip?: string;
  reasonShort: string;
}

/** Mirrors `MatchRecommendationDto` from dating-api match engine (strict FE contract). */
export interface MatchRecommendationDto {
  explainability: MatchExplainabilityDto;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
}

/** Profile text fields for display (loaded from UserProfile API). */
export interface ProfileDraft {
  aboutMe: string;
  aboutPartner: string;
  aboutRelationship: string;
}

/** One row in the matches list; enough for a card. */
export interface DatingMatchPreview {
  id: string;
  name: string;
  age: number;
  summary: string;
  compatibilityScore: number;
  strongReason: string;
  frictionPoint: string;
  /** When set (e.g. from API), drives chips + main subtitle; legacy fields remain for mocks without it. */
  explainability?: MatchExplainabilityDto;
  /** When set (e.g. from API), drives decision-oriented recommendation card above explainability. */
  recommendation?: MatchRecommendationDto;
}

/**
 * Detail view for `/dating/matches/[id]`. Same shape as preview for now;
 * widen when the backend returns richer profiles.
 */
export type DatingMatchDetail = DatingMatchPreview;

/** GET /api/v1/matches/:id — dating-ui detail contract. */
export interface MatchDetailApiResponse {
  ok: true;
  id: string;
  name: string;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
  chips: string[];
  expandedExplainability: string[];
}
