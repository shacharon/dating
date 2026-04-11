/**
 * Fails when structured JSON key allowlists drift from merge normalizers or DB parser coverage.
 */
import {
  AcceptedPartnerAlcohol,
  AcceptedPartnerGender,
  AcceptedPartnerSmoking,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  GenderIdentity,
  MinimumPartnerEducation,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../canonical/matching-canonical.types';
import {
  HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS,
  HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS,
} from './holy-grail-structured-contract';
import {
  mergeHolyGrailStructuredFactsPatch,
  mergeHolyGrailStructuredPreferencesPatch,
} from './holy-grail-structured-write.merge';
import {
  parseHolyGrailStructuredFactsFromJson,
  parseHolyGrailStructuredPreferencesFromJson,
} from './retrieval/holy-grail-structured-db-json';

describe('holy grail ingestion drift guards', () => {
  const factSamples: Record<(typeof HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS)[number], unknown> = {
    genderIdentity: GenderIdentity.MALE,
    dateOfBirth: '1990-05-15',
    childrenStatus: ChildrenStatusSelf.NO,
    wantsChildren: WantsChildrenSelf.YES,
    smoking: SmokingFrequencySelf.NEVER,
    alcoholUse: AlcoholUseSelf.NEVER,
    education: EducationLevelSelf.BACHELORS,
    religion: ReligionSelf.JEWISH,
  };

  const prefSamples: Record<(typeof HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS)[number], unknown> = {
    acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
    partnerAgeMin: 25,
    partnerAgeMax: 35,
    minimumPartnerEducation: MinimumPartnerEducation.HIGH_SCHOOL,
    acceptedPartnerSmoking: AcceptedPartnerSmoking.NONE_ONLY,
    acceptedPartnerAlcohol: AcceptedPartnerAlcohol.NONE_ONLY,
    partnerWantsChildren: PartnerWantsChildrenRequirement.NO_REQUIREMENT,
    partnerHasChildren: PartnerHasChildrenAcceptance.NO_REQUIREMENT,
    acceptedPartnerReligions: [ReligionSelf.JEWISH],
    maxDistanceKm: 40,
    similarityPreference: 'similar',
  };

  it('mergeHolyGrailStructuredFactsPatch supports every HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS', () => {
    for (const key of HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS) {
      expect(() =>
        mergeHolyGrailStructuredFactsPatch({}, { [key]: factSamples[key] }),
      ).not.toThrow();
    }
  });

  it('mergeHolyGrailStructuredPreferencesPatch supports every HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS', () => {
    for (const key of HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS) {
      const raw = prefSamples[key];
      expect(() => mergeHolyGrailStructuredPreferencesPatch({}, { [key]: raw })).not.toThrow();
    }
  });

  it('parseHolyGrailStructuredFactsFromJson returns each DB facts key when present alone', () => {
    for (const key of HOLY_GRAIL_STRUCTURED_FACTS_JSON_KEYS) {
      const parsed = parseHolyGrailStructuredFactsFromJson({ [key]: factSamples[key] });
      expect(parsed).toBeDefined();
      expect(parsed).toEqual(expect.objectContaining({ [key]: factSamples[key] }));
    }
  });

  it('parseHolyGrailStructuredPreferencesFromJson returns each DB preferences key when present alone', () => {
    for (const key of HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS) {
      const parsed = parseHolyGrailStructuredPreferencesFromJson({ [key]: prefSamples[key] });
      expect(parsed).toBeDefined();
      expect(parsed).toEqual(expect.objectContaining({ [key]: prefSamples[key] }));
    }
  });
});
