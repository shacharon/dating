import {
  AcceptedPartnerAlcohol,
  AcceptedPartnerGender,
  AcceptedPartnerSmoking,
  GenderIdentity,
  MinimumPartnerEducation,
  ReligionSelf,
} from '../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from './profile-sources.types';
import { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';

describe('mapProfileSourceToMatchingCanonical', () => {
  it('trims profileId and maps interest tags with normalize + dedupe + stable order', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: '  p1  ',
      extractionArrays: {
        interests_self: ['  Hiking ', 'hiking'],
        interests: ['books'],
        lifestyleTraits: ['  Yoga '],
      },
    });
    expect(m.version).toBe('matching_canonical_v1');
    expect(m.profileId).toBe('p1');
    expect(m.facts.interestTags).toEqual(['hiking', 'books', 'yoga']);
    expect(m.preferences).toEqual({});
    expect(m.searchOverrides).toEqual({});
  });

  it('omits interestTags when no non-empty tags after normalize', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      extractionArrays: { interests_self: ['   ', ''] },
    });
    expect(m.facts.interestTags).toBeUndefined();
  });

  it('throws on empty profileId', () => {
    expect(() => mapProfileSourceToMatchingCanonical({ profileId: '   ' })).toThrow(/profileId/);
  });

  it('throws on non-array extraction field', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        extractionArrays: { interests_self: 'x' as unknown as string[] },
      }),
    ).toThrow(/must be an array/);
  });

  it('throws on invalid structuredFacts enum string at runtime', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredFacts: { genderIdentity: 'ALIEN' as unknown as GenderIdentity },
      }),
    ).toThrow(/invalid structuredFacts.genderIdentity/);
  });

  it('throws on invalid calendar dateOfBirth', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredFacts: { dateOfBirth: '2020-02-30' },
      }),
    ).toThrow(/invalid calendar date/);
  });

  it('accepts valid dateOfBirth and structured preferences', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'u1',
      structuredFacts: {
        genderIdentity: GenderIdentity.FEMALE,
        dateOfBirth: '1990-05-15',
        primaryLocationLabel: '  TLV  ',
      },
      structuredPreferences: {
        acceptedPartnerGenders: [AcceptedPartnerGender.MALE],
        partnerAgeMin: 25,
        partnerAgeMax: 55,
        acceptedPartnerReligions: [ReligionSelf.JEWISH, ReligionSelf.JEWISH],
      },
      searchOverrides: { partnerAgeMax: 60 },
    });
    expect(m.facts.genderIdentity).toBe(GenderIdentity.FEMALE);
    expect(m.facts.dateOfBirth).toBe('1990-05-15');
    expect(m.facts.primaryLocationLabel).toBe('TLV');
    expect(m.preferences.acceptedPartnerGenders).toEqual([AcceptedPartnerGender.MALE]);
    expect(m.preferences.partnerAgeMin).toBe(25);
    expect(m.preferences.partnerAgeMax).toBe(55);
    expect(m.preferences.acceptedPartnerReligions).toEqual([ReligionSelf.JEWISH]);
    expect(m.searchOverrides.partnerAgeMax).toBe(60);
  });

  it('throws on unexpected searchOverrides key', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        searchOverrides: { evil: true } as Record<string, unknown>,
      }),
    ).toThrow(/unexpected key/);
  });

  it('throws on unexpected top-level input key', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        extraField: 1,
      } as HolyGrailProfileMappingInput),
    ).toThrow(/unexpected key .* in map input/);
  });

  it('maps rankingSignals onto canonical model without touching facts', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      rankingSignals: {
        dailyRhythm: 'early',
        autonomyTogetherness: 'deep',
        conflictStyle: 4,
        lifestylePace: 5,
        interestsTop: ['a', 'b'],
      },
    });
    expect(m.rankingSignals).toEqual({
      dailyRhythm: 'early',
      autonomyTogetherness: 'deep',
      conflictStyle: 4,
      lifestylePace: 5,
      interestsTop: ['a', 'b'],
    });
    expect(m.facts).toEqual({});
  });

  it('throws on unexpected rankingSignals key', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        rankingSignals: { evil: true } as Record<string, unknown>,
      } as HolyGrailProfileMappingInput),
    ).toThrow(/unexpected key .* in rankingSignals/);
  });

  it('maps personality trait ranking slices when present', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      rankingSignals: {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: [],
        personalityTraitsSelf: ['humor_playful'],
        personalityTraitsPartner: ['honesty_integrity'],
      },
    });
    expect(m.rankingSignals?.personalityTraitsSelf).toEqual(['humor_playful']);
    expect(m.rankingSignals?.personalityTraitsPartner).toEqual(['honesty_integrity']);
  });

  it('throws on non-canonical personality trait tag in rankingSignals', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        rankingSignals: {
          dailyRhythm: null,
          autonomyTogetherness: null,
          conflictStyle: null,
          lifestylePace: null,
          interestsTop: [],
          personalityTraitsSelf: ['not_a_tag'],
        },
      }),
    ).toThrow(/canonical personality trait tag/);
  });

  it('maps lifestyle signal ranking slices when present', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      rankingSignals: {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: [],
        lifestyleSignalsSelf: ['homebody'],
        lifestyleSignalsPartner: ['outdoors_nature'],
      },
    });
    expect(m.rankingSignals?.lifestyleSignalsSelf).toEqual(['homebody']);
    expect(m.rankingSignals?.lifestyleSignalsPartner).toEqual(['outdoors_nature']);
  });

  it('throws on non-canonical lifestyle signal tag in rankingSignals', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        rankingSignals: {
          dailyRhythm: null,
          autonomyTogetherness: null,
          conflictStyle: null,
          lifestylePace: null,
          interestsTop: [],
          lifestyleSignalsSelf: ['beach_bum'],
        },
      }),
    ).toThrow(/canonical lifestyle signal tag/);
  });

  it('maps canonical interest tag ranking slices when present', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      rankingSignals: {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: [],
        interestTagsSelf: ['music'],
        interestTagsPartner: ['film'],
      },
    });
    expect(m.rankingSignals?.interestTagsSelf).toEqual(['music']);
    expect(m.rankingSignals?.interestTagsPartner).toEqual(['film']);
  });

  it('throws on non-canonical interest tag in rankingSignals', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        rankingSignals: {
          dailyRhythm: null,
          autonomyTogetherness: null,
          conflictStyle: null,
          lifestylePace: null,
          interestsTop: [],
          interestTagsSelf: ['not_a_canonical_interest'],
        },
      }),
    ).toThrow(/canonical interest tag/);
  });

  it('throws on unexpected structuredFacts key', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredFacts: { genderTypo: GenderIdentity.MALE } as Record<string, unknown>,
      } as HolyGrailProfileMappingInput),
    ).toThrow(/unexpected key .* in structuredFacts/);
  });

  it('throws on unexpected extractionArrays key', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        extractionArrays: { interests_partner: ['x'] } as Record<string, unknown>,
      } as HolyGrailProfileMappingInput),
    ).toThrow(/unexpected key .* in extractionArrays/);
  });

  it('throws on unexpected structuredPreferences key', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: { unknownPref: true } as Record<string, unknown>,
      } as HolyGrailProfileMappingInput),
    ).toThrow(/unexpected key .* in structuredPreferences/);
  });

  it('throws on future dateOfBirth', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredFacts: { dateOfBirth: '2099-06-01' },
      }),
    ).toThrow(/must not be in the future/);
  });

  it('throws when enum field is not a string', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredFacts: { genderIdentity: 123 as unknown as GenderIdentity },
      }),
    ).toThrow(/must be a string enum value/);
  });

  it('throws on empty acceptedPartnerGenders when provided', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: { acceptedPartnerGenders: [] },
      }),
    ).toThrow(/non-empty array/);
  });

  it('omits acceptedPartnerReligions when an empty array is provided (normalize to absent)', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: { acceptedPartnerReligions: [] },
    });
    expect(m.preferences.acceptedPartnerReligions).toBeUndefined();
  });

  it('maps only preference keys that are present on structuredPreferences', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: {
        minimumPartnerEducation: MinimumPartnerEducation.BACHELORS,
        acceptedPartnerSmoking: AcceptedPartnerSmoking.NONE_ONLY,
      },
    });
    expect(m.preferences).toEqual({
      minimumPartnerEducation: MinimumPartnerEducation.BACHELORS,
      acceptedPartnerSmoking: [AcceptedPartnerSmoking.NONE_ONLY],
    });
  });

  it('maps acceptedPartnerSmoking/Alcohol arrays as arrays (no scalar collapse)', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: {
        acceptedPartnerSmoking: [
          AcceptedPartnerSmoking.NONE_ONLY,
          AcceptedPartnerSmoking.SOCIAL_OK,
        ],
        acceptedPartnerAlcohol: [
          AcceptedPartnerAlcohol.NONE_ONLY,
          AcceptedPartnerAlcohol.MODERATE_OK,
        ],
      },
    });
    expect(m.preferences.acceptedPartnerSmoking).toEqual([
      AcceptedPartnerSmoking.NONE_ONLY,
      AcceptedPartnerSmoking.SOCIAL_OK,
    ]);
    expect(m.preferences.acceptedPartnerAlcohol).toEqual([
      AcceptedPartnerAlcohol.NONE_ONLY,
      AcceptedPartnerAlcohol.MODERATE_OK,
    ]);
  });

  it('treats empty acceptedPartnerSmoking/Alcohol arrays as absent preference', () => {
    const m = mapProfileSourceToMatchingCanonical({
      profileId: 'p',
      structuredPreferences: {
        acceptedPartnerSmoking: [],
        acceptedPartnerAlcohol: [],
      },
    });
    expect(m.preferences.acceptedPartnerSmoking).toBeUndefined();
    expect(m.preferences.acceptedPartnerAlcohol).toBeUndefined();
  });

  it('throws on invalid acceptedPartnerSmoking/Alcohol array members', () => {
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: {
          acceptedPartnerSmoking: ['BAD_ENUM'] as unknown as AcceptedPartnerSmoking[],
        },
      }),
    ).toThrow(/invalid structuredPreferences\.acceptedPartnerSmoking/);
    expect(() =>
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: {
          acceptedPartnerAlcohol: ['BAD_ENUM'] as unknown as AcceptedPartnerAlcohol[],
        },
      }),
    ).toThrow(/invalid structuredPreferences\.acceptedPartnerAlcohol/);
  });

  it('maps similarityPreference when set; preserves null; sparse when omitted', () => {
    expect(
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: { similarityPreference: 'different' },
      }).preferences.similarityPreference,
    ).toBe('different');
    expect(
      mapProfileSourceToMatchingCanonical({
        profileId: 'p',
        structuredPreferences: { similarityPreference: null },
      }).preferences.similarityPreference,
    ).toBeNull();
    expect(
      mapProfileSourceToMatchingCanonical({ profileId: 'p' }).preferences.similarityPreference,
    ).toBeUndefined();
  });
});
