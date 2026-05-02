import {
  AcceptedPartnerGender,
  GenderIdentity,
} from '../../canonical/matching-canonical.types';
import { mapProfileSourceToMatchingCanonical } from '../profile-to-canonical.mapper';
import { filterCandidatesByHardEligibility } from '../pairwise-hard-eligibility-filter';
import {
  buildHolyGrailProfileMappingInputFromDbRow,
  parseHolyGrailStructuredFactsFromJson,
  parseHolyGrailStructuredPreferencesFromJson,
} from './holy-grail-structured-db-json';

describe('holy-grail-structured-db-json / DB row → mapping input', () => {
  it('parses sparse facts JSON (gender, DOB, children, wants, smoking, alcohol, education, religion)', () => {
    const sf = parseHolyGrailStructuredFactsFromJson({
      genderIdentity: 'FEMALE',
      dateOfBirth: '1991-03-15',
      childrenStatus: 'NO',
      wantsChildren: 'YES',
      smoking: 'NEVER',
      alcoholUse: 'RARE',
      education: 'BACHELORS',
      religion: 'JEWISH',
    });
    expect(sf).toEqual({
      genderIdentity: GenderIdentity.FEMALE,
      dateOfBirth: '1991-03-15',
      childrenStatus: 'NO',
      wantsChildren: 'YES',
      smoking: 'NEVER',
      alcoholUse: 'RARE',
      education: 'BACHELORS',
      religion: 'JEWISH',
    });
  });

  it('throws on invalid facts enum or invalid DOB shape', () => {
    expect(() =>
      parseHolyGrailStructuredFactsFromJson({
        genderIdentity: 'ALIEN',
        dateOfBirth: 'not-a-date',
      }),
    ).toThrow(/invalid genderIdentity/);
  });

  it('throws on inconsistent partner age bounds in preferences JSON', () => {
    expect(() =>
      parseHolyGrailStructuredPreferencesFromJson({
        acceptedPartnerGenders: ['MALE', 'FEMALE'],
        partnerAgeMin: 40,
        partnerAgeMax: 30,
        maxDistanceKm: 50,
      }),
    ).toThrow(/partnerAgeMin must be <= partnerAgeMax/);
  });

  it('parses preferences JSON including maxDistanceKm when age bounds are valid', () => {
    expect(
      parseHolyGrailStructuredPreferencesFromJson({
        acceptedPartnerGenders: ['MALE', 'FEMALE'],
        partnerAgeMin: 30,
        partnerAgeMax: 40,
        maxDistanceKm: 50,
      }),
    ).toEqual({
      acceptedPartnerGenders: [AcceptedPartnerGender.MALE, AcceptedPartnerGender.FEMALE],
      partnerAgeMin: 30,
      partnerAgeMax: 40,
      maxDistanceKm: 50,
    });
  });

  it('merges extraction arrays with structured layers from row shape', () => {
    const input = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 'p1',
      extractionV2: {
        interests_self: ['yoga'],
        interests: [],
        lifestyleTraits: [],
      },
      holyGrailStructuredFacts: { genderIdentity: 'NON_BINARY' },
      holyGrailStructuredPreferences: {
        acceptedPartnerSmoking: ['ANY'],
        acceptedPartnerAlcohol: ['MODERATE_OK'],
      },
    });
    expect(input.profileId).toBe('p1');
    expect(input.extractionArrays?.interests_self).toEqual(['yoga']);
    expect(input.structuredFacts?.genderIdentity).toBe(GenderIdentity.NON_BINARY);
    expect(input.structuredPreferences?.acceptedPartnerSmoking).toEqual(['ANY']);
    expect(input.structuredPreferences?.acceptedPartnerAlcohol).toEqual([
      'MODERATE_OK',
    ]);
    expect(input.rankingSignals).toEqual({
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [],
    });
  });

  it('treats empty smoking/alcohol arrays as no preference (omitted)', () => {
    const input = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 'p-empty',
      extractionV2: null,
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: {
        acceptedPartnerSmoking: [],
        acceptedPartnerAlcohol: [],
      },
    });
    expect(input.structuredPreferences?.acceptedPartnerSmoking).toBeUndefined();
    expect(input.structuredPreferences?.acceptedPartnerAlcohol).toBeUndefined();
  });

  it('throws on invalid smoking/alcohol array values', () => {
    expect(() =>
      parseHolyGrailStructuredPreferencesFromJson({
        acceptedPartnerSmoking: ['NOT_A_VALUE'],
      }),
    ).toThrow(/invalid acceptedPartnerSmoking/);
    expect(() =>
      parseHolyGrailStructuredPreferencesFromJson({
        acceptedPartnerAlcohol: ['NOPE'],
      }),
    ).toThrow(/invalid acceptedPartnerAlcohol/);
  });

  it('builds rankingSignals from self snapshot HG columns only (DB runtime)', () => {
    const input = buildHolyGrailProfileMappingInputFromDbRow({
      profileId: 'p2',
      extractionV2: {
        interests_self: ['fallback'],
        interests: [],
        lifestyleTraits: [],
      },
      holyGrailStructuredFacts: null,
      holyGrailStructuredPreferences: null,
      signalSelf: {
        lifestylePace: 6,
        conflictStyle: 5,
        hgRankingDailyRhythm: 'early_bird',
        hgRankingAutonomyTogetherness: 'solo_recovery_time_matters',
        hgRankingInterestsTop: ['hiking', 'books'],
      },
    });
    expect(input.rankingSignals).toEqual({
      dailyRhythm: 'early_bird',
      autonomyTogetherness: 'solo_recovery_time_matters',
      conflictStyle: 5,
      lifestylePace: 6,
      interestsTop: ['hiking', 'books'],
    });
  });

  it('hard filter blocks candidate when persisted prefs/facts disagree (full pipeline)', () => {
    const evaluatedAt = new Date('2020-06-15T12:00:00.000Z');
    const searcher = mapProfileSourceToMatchingCanonical(
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: 's',
        extractionV2: null,
        holyGrailStructuredFacts: null,
        holyGrailStructuredPreferences: { acceptedPartnerGenders: ['FEMALE'] },
      }),
    );
    const male = mapProfileSourceToMatchingCanonical(
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: 'm',
        extractionV2: null,
        holyGrailStructuredFacts: { genderIdentity: 'MALE' },
        holyGrailStructuredPreferences: null,
      }),
    );
    const female = mapProfileSourceToMatchingCanonical(
      buildHolyGrailProfileMappingInputFromDbRow({
        profileId: 'f',
        extractionV2: null,
        holyGrailStructuredFacts: { genderIdentity: 'FEMALE' },
        holyGrailStructuredPreferences: null,
      }),
    );
    const f = filterCandidatesByHardEligibility({
      searcher,
      candidates: [male, female],
      evaluatedAt,
      includeDebug: true,
    });
    expect(f.filteredCandidates.map((c) => c.profileId)).toEqual(['f']);
    expect(f.debug?.passed).toBe(1);
  });
});
