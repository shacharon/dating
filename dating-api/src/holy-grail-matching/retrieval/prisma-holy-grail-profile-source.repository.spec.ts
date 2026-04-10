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

  it('drops invalid enum strings and invalid DOB', () => {
    expect(
      parseHolyGrailStructuredFactsFromJson({
        genderIdentity: 'ALIEN',
        dateOfBirth: 'not-a-date',
      }),
    ).toBeUndefined();
  });

  it('parses preferences JSON; omits maxDistanceKm; rejects inconsistent age bounds', () => {
    expect(
      parseHolyGrailStructuredPreferencesFromJson({
        acceptedPartnerGenders: ['MALE', 'FEMALE'],
        partnerAgeMin: 40,
        partnerAgeMax: 30,
        maxDistanceKm: 50,
      }),
    ).toEqual({
      acceptedPartnerGenders: [AcceptedPartnerGender.MALE, AcceptedPartnerGender.FEMALE],
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
      holyGrailStructuredPreferences: { acceptedPartnerSmoking: 'ANY' },
    });
    expect(input.profileId).toBe('p1');
    expect(input.extractionArrays?.interests_self).toEqual(['yoga']);
    expect(input.structuredFacts?.genderIdentity).toBe(GenderIdentity.NON_BINARY);
    expect(input.structuredPreferences?.acceptedPartnerSmoking).toBe('ANY');
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
