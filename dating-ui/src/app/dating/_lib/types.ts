/**
 * Shared /dating mock contracts. Shape names mirror likely API DTOs later.
 * Optional HG fields: use `tryHolyGrailMatchDiagnosticsApi` before rendering a diagnostic block.
 */

import type { ProfileFormState } from '@/lib/profile-form';

/** Mirrors `MatchExplainabilityDto` from dating-api match engine (strict FE contract). */
export interface MatchExplainabilityDto {
  positiveChips: string[];
  tensionChip?: string;
  reasonShort: string;
  /** Present when both profiles share at least one interest tag. */
  sharedInterestNote?: string;
}

/** Mirrors `MatchRecommendationDto` from dating-api match engine (strict FE contract). */
export interface MatchRecommendationDto {
  explainability: MatchExplainabilityDto;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
}

/** Profile draft / review shape (aligned with onboarding form + GET /api/v1/me/profile). */
export type ProfileDraft = ProfileFormState;

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
  /** Optional HG triple; validate with `tryHolyGrailMatchDiagnosticsApi` before UI. */
  hgMutualPass?: boolean;
  hgOverallStatus?: string;
  hgRankScore?: number;
}

/**
 * Detail view for `/dating/matches/[id]`. Same shape as preview for now;
 * widen when the backend returns richer profiles.
 */
export type DatingMatchDetail = DatingMatchPreview;

/** Holy Grail children soft-pass flags (per direction); drives badges / optional list filter — not list sort order. */
export interface MatchDetailChildrenUnsure {
  profile_a_to_profile_b: boolean;
  profile_b_to_profile_a: boolean;
}

/** GET /api/v1/matches/:id — dating-ui detail contract. */
export interface MatchDetailApiResponse {
  ok: true;
  id: string;
  /** Legacy: same as profileB.name */
  name: string;
  profileA?: { id: string; name: string };
  profileB?: { id: string; name: string };
  /** Omitted on older API responses; client defaults to both false. */
  children_unsure?: MatchDetailChildrenUnsure;
  /** Rounded final match score when the API provides it. */
  score?: number;
  confidence?: number;
  reasonShort?: string;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
  chips: string[];
  tensionChip?: string;
  expandedExplainability: string[];
  /** Optional HG triple; validate with `tryHolyGrailMatchDiagnosticsApi` before UI. */
  hgMutualPass?: boolean;
  hgOverallStatus?: string;
  hgRankScore?: number;
}
