import { describe, it, expect } from '@jest/globals';
import {
  computeProfileQuality,
  PROFILE_QUALITY_POINTS,
  PROFILE_QUALITY_STORY_MIN_CHARS,
  type ProfileQualityInput,
} from './profile-quality.service';

function base(partial: Partial<ProfileQualityInput> = {}): ProfileQualityInput {
  return {
    nickname: null,
    city: null,
    country: null,
    locationLabel: null,
    birthDate: null,
    gender: null,
    desiredPartnerGenders: null,
    aboutMe: null,
    aboutPartner: null,
    aboutRelationship: null,
    hasApprovedPhoto: false,
    ...partial,
  };
}

const long = 'x'.repeat(PROFILE_QUALITY_STORY_MIN_CHARS);
const almost = 'x'.repeat(PROFILE_QUALITY_STORY_MIN_CHARS - 1);

describe('computeProfileQuality', () => {
  it('scores 0 and lists all suggestions in lock order when empty', () => {
    const q = computeProfileQuality(base());
    expect(q.score).toBe(0);
    expect(q.suggestions.map((s) => s.id)).toEqual([
      'photo',
      'basics',
      'nickname',
      'location',
      'aboutMe',
      'aboutPartner',
      'aboutRelationship',
    ]);
    expect(q.suggestions[0]?.points).toBe(PROFILE_QUALITY_POINTS.photo);
  });

  it('scores 100 when all criteria pass', () => {
    const q = computeProfileQuality(
      base({
        nickname: 'Noa',
        city: 'Tel Aviv',
        birthDate: '1990-01-01',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
        aboutMe: long,
        aboutPartner: long,
        aboutRelationship: long,
        hasApprovedPhoto: true,
      }),
    );
    expect(q.score).toBe(100);
    expect(q.suggestions).toEqual([]);
    expect(q.completeness).toEqual({
      hasNickname: true,
      hasLocation: true,
      hasBasics: true,
      hasAboutMe: true,
      hasAboutPartner: true,
      hasAboutRelationship: true,
      hasApprovedPhoto: true,
    });
  });

  it('requires 50 chars for story fields (49 fails, 50 passes)', () => {
    const fail = computeProfileQuality(base({ aboutMe: almost }));
    expect(fail.completeness.hasAboutMe).toBe(false);

    const pass = computeProfileQuality(base({ aboutMe: long }));
    expect(pass.completeness.hasAboutMe).toBe(true);
    expect(pass.score).toBe(PROFILE_QUALITY_POINTS.aboutMe);
  });

  it('location passes on any of city/country/locationLabel', () => {
    expect(
      computeProfileQuality(base({ locationLabel: 'TLV' })).completeness
        .hasLocation,
    ).toBe(true);
    expect(
      computeProfileQuality(base({ country: 'IL' })).completeness.hasLocation,
    ).toBe(true);
  });

  it('basics fail when gender is PREFER_NOT_TO_SAY', () => {
    const q = computeProfileQuality(
      base({
        birthDate: new Date('1990-01-01'),
        gender: 'PREFER_NOT_TO_SAY',
        desiredPartnerGenders: ['MALE'],
      }),
    );
    expect(q.completeness.hasBasics).toBe(false);
  });

  it('does not award photo points without approved photo', () => {
    const q = computeProfileQuality(base({ hasApprovedPhoto: false }));
    expect(q.completeness.hasApprovedPhoto).toBe(false);
    expect(q.suggestions.some((s) => s.id === 'photo')).toBe(true);

    const withPhoto = computeProfileQuality(base({ hasApprovedPhoto: true }));
    expect(withPhoto.score).toBe(PROFILE_QUALITY_POINTS.photo);
  });
});
