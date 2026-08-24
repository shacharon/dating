import type { MeMatchItemDto } from '@/lib/api/me-matches-api';

export function baseMatch(
  explainability: MeMatchItemDto['explainability'],
): MeMatchItemDto {
  return {
    id: 'prof-expansion-01',
    nickname: 'Test',
    gender: 'FEMALE',
    ageYears: 30,
    locationLabel: 'Tel Aviv',
    analyzedAt: null,
    hasEvaluation: true,
    matchScore: 82,
    explainability,
    recommendation: null,
  };
}
