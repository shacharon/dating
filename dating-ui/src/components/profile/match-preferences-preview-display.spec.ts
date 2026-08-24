import { describe, it, expect } from 'vitest';
import { enCopy } from '@/lib/i18n/en';
import {
  matchPreferencesPreviewHasValues,
  matchPreferencesPreviewLines,
} from '@/components/profile/match-preferences-preview-display';
import { emptyMatchPreferencesFormState } from '@/lib/matches/match-preferences-form';

describe('matchPreferencesPreviewLines', () => {
  it('builds age, distance, and gender lines', () => {
    const lines = matchPreferencesPreviewLines(
      {
        partnerAgeMin: '25',
        partnerAgeMax: '35',
        maxDistanceKm: '50',
        desiredPartnerGenders: ['MALE'],
      },
      enCopy,
    );
    expect(lines.map((l) => l.key)).toEqual(['age', 'distance', 'genders']);
    expect(lines[0]?.text).toContain('25–35');
    expect(lines[1]?.text).toContain('50 km');
    expect(lines[2]?.text).toContain('Male');
  });

  it('omits empty fields and reports hasValues', () => {
    expect(
      matchPreferencesPreviewHasValues(emptyMatchPreferencesFormState()),
    ).toBe(false);
    expect(
      matchPreferencesPreviewLines(emptyMatchPreferencesFormState(), enCopy),
    ).toEqual([]);
    expect(
      matchPreferencesPreviewHasValues({
        ...emptyMatchPreferencesFormState(),
        partnerAgeMin: '30',
      }),
    ).toBe(true);
  });
});
