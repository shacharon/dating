import type { MatchPreferencesFormState } from '@/lib/matches/match-preferences-form';
import type { AppCopySchema } from '@/lib/i18n/types';
import type { MeProfileGender } from '@/lib/api/me-profile-api';

export type PrefPreviewLine = { key: string; text: string };

function partnerGenderLabel(
  gender: MeProfileGender,
  copy: AppCopySchema,
): string {
  return (
    copy.matchPreferences.partnerGender[gender] ??
    copy.gender[gender as keyof AppCopySchema['gender']] ??
    gender
  );
}

/** Build bullet lines for the Settings match-prefs preview card. */
export function matchPreferencesPreviewLines(
  state: MatchPreferencesFormState,
  copy: AppCopySchema,
): PrefPreviewLine[] {
  const lines: PrefPreviewLine[] = [];
  const mp = copy.matchPreferences;
  const min = state.partnerAgeMin.trim();
  const max = state.partnerAgeMax.trim();

  if (min || max) {
    const range =
      min && max ? `${min}–${max}` : min ? `${min}+` : `≤${max}`;
    lines.push({
      key: 'age',
      text: `${mp.sections.age}: ${range}`,
    });
  }

  if (state.maxDistanceKm.trim()) {
    const km = state.maxDistanceKm.trim();
    lines.push({
      key: 'distance',
      text: `${mp.sections.distance}: ${km} km`,
    });
  }

  if (state.desiredPartnerGenders.length > 0) {
    const labels = state.desiredPartnerGenders.map((g) =>
      partnerGenderLabel(g, copy),
    );
    lines.push({
      key: 'genders',
      text: `${mp.sections.partnerGenders}: ${labels.join(', ')}`,
    });
  }

  return lines;
}

export function matchPreferencesPreviewHasValues(
  state: MatchPreferencesFormState,
): boolean {
  return (
    Boolean(state.partnerAgeMin.trim()) ||
    Boolean(state.partnerAgeMax.trim()) ||
    Boolean(state.maxDistanceKm.trim()) ||
    state.desiredPartnerGenders.length > 0
  );
}
