/**
 * GET /api/v1/me/profile/quality response.
 * Story text criteria use trimmed length ≥ 50 (JS string length).
 */

export type ProfileQualitySuggestionId =
  | 'photo'
  | 'nickname'
  | 'location'
  | 'basics'
  | 'aboutMe'
  | 'aboutPartner'
  | 'aboutRelationship';

export type ProfileQualityCompletenessDto = {
  hasNickname: boolean;
  hasLocation: boolean;
  hasBasics: boolean;
  hasAboutMe: boolean;
  hasAboutPartner: boolean;
  hasAboutRelationship: boolean;
  hasApprovedPhoto: boolean;
};

export type ProfileQualitySuggestionDto = {
  id: ProfileQualitySuggestionId;
  /** Points awarded if this criterion is completed */
  points: number;
};

export class ProfileQualityDto {
  /** Weighted total 0–100 */
  score!: number;
  completeness!: ProfileQualityCompletenessDto;
  suggestions!: ProfileQualitySuggestionDto[];
}
