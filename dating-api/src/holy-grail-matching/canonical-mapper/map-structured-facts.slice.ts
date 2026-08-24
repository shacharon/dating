import {
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  ExerciseLevelSelf,
  GenderIdentity,
  LivingSituationSelf,
  PoliticsSelf,
  ReligionSelf,
  RelationshipStatusSelf,
  SexualOrientationSelf,
  SmokingFrequencySelf,
  type MatchingFacts,
  WantsChildrenSelf,
  WorkStudySituationSelf,
} from '../../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import { matchingCanonicalEnumStringValues } from '../holy-grail-canonical-enum';
import {
  assertHolyGrailCalendarDateYmd,
  assertHolyGrailDateOfBirthNotFuture,
  HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_KEY_SET,
} from '../holy-grail-structured-contract';
import {
  assertNoExtraKeys,
  assertPlainRecord,
  assertStringInEnum,
} from './canonical-mapper.validation';
import { buildInterestTags } from './map-extraction-arrays.slice';

const STRUCTURED_FACTS_KEYS = HOLY_GRAIL_STRUCTURED_FACTS_MAPPER_KEY_SET;

export function validateStructuredFactsSlice(
  sf: HolyGrailProfileMappingInput['structuredFacts'],
): void {
  if (sf === undefined || sf === null) {
    return;
  }
  assertPlainRecord(sf, 'structuredFacts');
  assertNoExtraKeys(
    sf as Record<string, unknown>,
    STRUCTURED_FACTS_KEYS,
    'structuredFacts',
  );
}

export function buildFacts(input: HolyGrailProfileMappingInput): MatchingFacts {
  const sf = input.structuredFacts;
  const facts: MatchingFacts = {};
  if (!sf) {
    const tags = buildInterestTags(input);
    if (tags) facts.interestTags = tags;
    if (
      input.dealbreakerSelfFacts !== undefined &&
      Object.keys(input.dealbreakerSelfFacts).length > 0
    ) {
      facts.dealbreakerSelfFacts = { ...input.dealbreakerSelfFacts };
    }
    return facts;
  }

  const g = matchingCanonicalEnumStringValues(GenderIdentity);
  const so = matchingCanonicalEnumStringValues(SexualOrientationSelf);
  const rs = matchingCanonicalEnumStringValues(RelationshipStatusSelf);
  const cs = matchingCanonicalEnumStringValues(ChildrenStatusSelf);
  const wc = matchingCanonicalEnumStringValues(WantsChildrenSelf);
  const sm = matchingCanonicalEnumStringValues(SmokingFrequencySelf);
  const al = matchingCanonicalEnumStringValues(AlcoholUseSelf);
  const ex = matchingCanonicalEnumStringValues(ExerciseLevelSelf);
  const rel = matchingCanonicalEnumStringValues(ReligionSelf);
  const pol = matchingCanonicalEnumStringValues(PoliticsSelf);
  const ed = matchingCanonicalEnumStringValues(EducationLevelSelf);
  const liv = matchingCanonicalEnumStringValues(LivingSituationSelf);
  const ws = matchingCanonicalEnumStringValues(WorkStudySituationSelf);

  if (sf.genderIdentity !== undefined) {
    facts.genderIdentity = assertStringInEnum(
      sf.genderIdentity,
      g,
      'structuredFacts.genderIdentity',
    ) as GenderIdentity;
  }
  if (sf.sexualOrientation !== undefined) {
    facts.sexualOrientation = assertStringInEnum(
      sf.sexualOrientation,
      so,
      'structuredFacts.sexualOrientation',
    ) as SexualOrientationSelf;
  }
  if (sf.relationshipStatus !== undefined) {
    facts.relationshipStatus = assertStringInEnum(
      sf.relationshipStatus,
      rs,
      'structuredFacts.relationshipStatus',
    ) as RelationshipStatusSelf;
  }
  if (sf.childrenStatus !== undefined) {
    facts.childrenStatus = assertStringInEnum(
      sf.childrenStatus,
      cs,
      'structuredFacts.childrenStatus',
    ) as ChildrenStatusSelf;
  }
  if (sf.wantsChildren !== undefined) {
    facts.wantsChildren = assertStringInEnum(
      sf.wantsChildren,
      wc,
      'structuredFacts.wantsChildren',
    ) as WantsChildrenSelf;
  }
  if (sf.smoking !== undefined) {
    facts.smoking = assertStringInEnum(
      sf.smoking,
      sm,
      'structuredFacts.smoking',
    ) as SmokingFrequencySelf;
  }
  if (sf.alcoholUse !== undefined) {
    facts.alcoholUse = assertStringInEnum(
      sf.alcoholUse,
      al,
      'structuredFacts.alcoholUse',
    ) as AlcoholUseSelf;
  }
  if (sf.exerciseLevel !== undefined) {
    facts.exerciseLevel = assertStringInEnum(
      sf.exerciseLevel,
      ex,
      'structuredFacts.exerciseLevel',
    ) as ExerciseLevelSelf;
  }
  if (sf.religion !== undefined) {
    facts.religion = assertStringInEnum(
      sf.religion,
      rel,
      'structuredFacts.religion',
    ) as ReligionSelf;
  }
  if (sf.politics !== undefined) {
    facts.politics = assertStringInEnum(
      sf.politics,
      pol,
      'structuredFacts.politics',
    ) as PoliticsSelf;
  }
  if (sf.education !== undefined) {
    facts.education = assertStringInEnum(
      sf.education,
      ed,
      'structuredFacts.education',
    ) as EducationLevelSelf;
  }
  if (sf.livingSituation !== undefined) {
    facts.livingSituation = assertStringInEnum(
      sf.livingSituation,
      liv,
      'structuredFacts.livingSituation',
    ) as LivingSituationSelf;
  }
  if (sf.workStudySituation !== undefined) {
    facts.workStudySituation = assertStringInEnum(
      sf.workStudySituation,
      ws,
      'structuredFacts.workStudySituation',
    ) as WorkStudySituationSelf;
  }
  if (sf.dateOfBirth !== undefined) {
    if (typeof sf.dateOfBirth !== 'string') {
      throw new Error(
        'HolyGrail map: structuredFacts.dateOfBirth must be a string',
      );
    }
    const ymd = assertHolyGrailCalendarDateYmd(sf.dateOfBirth);
    assertHolyGrailDateOfBirthNotFuture(ymd);
    facts.dateOfBirth = ymd;
  }
  if (sf.primaryLocationLabel !== undefined) {
    if (typeof sf.primaryLocationLabel !== 'string') {
      throw new Error(
        'HolyGrail map: structuredFacts.primaryLocationLabel must be a string',
      );
    }
    const pl = sf.primaryLocationLabel.trim();
    if (pl.length === 0) {
      throw new Error(
        'HolyGrail map: structuredFacts.primaryLocationLabel must be non-empty when provided',
      );
    }
    facts.primaryLocationLabel = pl;
  }

  const tags = buildInterestTags(input);
  if (tags) facts.interestTags = tags;

  if (
    input.dealbreakerSelfFacts !== undefined &&
    Object.keys(input.dealbreakerSelfFacts).length > 0
  ) {
    facts.dealbreakerSelfFacts = { ...input.dealbreakerSelfFacts };
  }

  return facts;
}
