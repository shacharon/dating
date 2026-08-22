/**
 * Authenticated GET `/api/v1/me/profile/quality` (session cookie).
 */

import { getApiBase } from '@/lib/api-base';
import { authenticatedFetch } from '@/lib/authenticated-fetch';
import {
  suggestionHref,
  type ProfileSuggestionId,
} from '@/lib/profile-completeness';

export type ProfileQualitySuggestionId = ProfileSuggestionId;

export type ProfileQualityCompleteness = {
  hasNickname: boolean;
  hasLocation: boolean;
  hasBasics: boolean;
  hasAboutMe: boolean;
  hasAboutPartner: boolean;
  hasAboutRelationship: boolean;
  hasApprovedPhoto: boolean;
};

export type ProfileQualitySuggestion = {
  id: ProfileQualitySuggestionId;
  points: number;
};

export type ProfileQualityDto = {
  score: number;
  completeness: ProfileQualityCompleteness;
  suggestions: ProfileQualitySuggestion[];
};

export async function fetchProfileQuality(): Promise<ProfileQualityDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/quality';
  const res = await authenticatedFetch(path, {
    method: 'GET',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(
      `GET /api/v1/me/profile/quality failed: ${res.status} ${res.statusText}`,
    );
  }
  return (await res.json()) as ProfileQualityDto;
}

/** First `limit` API suggestions → i18n label + deep link. */
export function qualitySuggestionChips(
  suggestions: ProfileQualitySuggestion[],
  labels: Partial<Record<ProfileQualitySuggestionId, string>>,
  limit = 2,
): { id: ProfileQualitySuggestionId; label: string; href: string }[] {
  return suggestions.slice(0, limit).map((s) => ({
    id: s.id,
    label: labels[s.id] ?? s.id,
    href: suggestionHref(s.id),
  }));
}
