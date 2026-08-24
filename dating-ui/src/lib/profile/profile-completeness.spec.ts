import { describe, it, expect } from 'vitest';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import {
  buildCompletenessFlags,
  completenessScorePercent,
  suggestionChips,
} from './profile-completeness';

function draft(partial: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    nickname: '',
    birthDate: '',
    gender: '',
    desiredPartnerGenders: [],
    city: '',
    country: '',
    locationLabel: '',
    aboutMe: '',
    aboutPartner: '',
    aboutRelationship: '',
    ...partial,
  };
}

describe('profile-completeness', () => {
  it('scores 0 / 33 / 67 / 100 by bucket', () => {
    const empty = buildCompletenessFlags(draft(), false);
    expect(completenessScorePercent(empty)).toBe(0);

    const photoOnly = buildCompletenessFlags(draft(), true);
    expect(completenessScorePercent(photoOnly)).toBe(33);

    const withBasics = buildCompletenessFlags(
      draft({
        birthDate: '1990-01-01',
        gender: 'WOMAN',
        desiredPartnerGenders: ['MAN'],
      }),
      true,
    );
    expect(completenessScorePercent(withBasics)).toBe(67);

    const full = buildCompletenessFlags(
      draft({
        birthDate: '1990-01-01',
        gender: 'WOMAN',
        desiredPartnerGenders: ['MAN'],
        aboutMe: 'a',
        aboutPartner: 'b',
        aboutRelationship: 'c',
      }),
      true,
    );
    expect(completenessScorePercent(full)).toBe(100);
  });

  it('returns at most two suggestion chips preferring photo then basics', () => {
    const flags = buildCompletenessFlags(draft(), false);
    const chips = suggestionChips(
      flags,
      { photo: 'Photo', basics: 'Basics', aboutMe: 'About' },
      2,
    );
    expect(chips.map((c) => c.id)).toEqual(['photo', 'basics']);
    expect(chips[0]?.href).toBe('/profile?tab=edit#photos');
  });
});
