/**
 * Deterministic structured HG layers for `synthetic-hg-gap-*` seed profiles.
 * Source of truth is the same free-text fields shipped in `profiles-hg-gap-*.json`
 * (not runtime inference in the matcher/report).
 */

import {
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  GenderIdentity,
  PartnerHasChildrenAcceptance,
  PartnerWantsChildrenRequirement,
  ReligionSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../src/canonical/matching-canonical.types';
import {
  AcceptedPartnerAlcohol,
  AcceptedPartnerSmoking,
  AcceptedPartnerGender,
  MinimumPartnerEducation,
} from '../src/canonical/matching-canonical.types';

export interface DerivedHgGapStructured {
  readonly structuredFactsPatch: Record<string, unknown>;
  readonly structuredPreferencesPatch: Record<string, unknown>;
}

function dobFromAge(age: number): string {
  const y = 2026 - age;
  return `${String(y).padStart(4, '0')}-06-15`;
}

function parseSelfGenderAge(aboutMe: string, aboutPartner: string): { gender: GenderIdentity; age: number } {
  const he = aboutMe.match(/^(בת|בן)\s+(\d+)/);
  if (he) {
    const age = Number(he[2]);
    const gender = he[1] === 'בת' ? GenderIdentity.FEMALE : GenderIdentity.MALE;
    return { gender, age };
  }
  const en = aboutMe.match(/^(\d+),/);
  if (!en) {
    throw new Error(`Cannot parse age from aboutMe: ${aboutMe.slice(0, 80)}`);
  }
  const age = Number(en[1]);
  const ap = aboutPartner.toLowerCase();
  if (/looking for a man only|looking for a man\b/i.test(aboutPartner)) {
    return { gender: GenderIdentity.FEMALE, age };
  }
  if (/looking for a woman only|looking for a woman\b/i.test(aboutPartner)) {
    return { gender: GenderIdentity.MALE, age };
  }
  if (/looking for men or women/i.test(aboutPartner)) {
    return { gender: GenderIdentity.FEMALE, age };
  }
  throw new Error(`Cannot infer gender for English profile: ${ap.slice(0, 80)}`);
}

function parsePartnerAgeRange(text: string): { min: number; max: number } {
  let m = text.match(/גילאי\s+(\d+)\s*עד\s*(\d+)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = text.match(/בגיל\s+(\d+)\s*עד\s*(\d+)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = text.match(/בין\s+(\d+)\s+ל[-\s]?(\d+)/);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = text.match(/age\s+(\d+)\s+to\s+(\d+)/i);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  m = text.match(/age\s+(\d+)\s*-\s*(\d+)/i);
  if (m) return { min: Number(m[1]), max: Number(m[2]) };
  throw new Error(`Cannot parse partner age range: ${text.slice(0, 120)}`);
}

function parseAcceptedGenders(text: string): AcceptedPartnerGender[] {
  if (/נשים וגברים|men or women/i.test(text)) {
    return [AcceptedPartnerGender.MALE, AcceptedPartnerGender.FEMALE];
  }
  // English: match "woman only" before "man only" (substring trap: "wo**man** only").
  if (/אישה בלבד|מחפש אישה בלבד|מחפשת אישה בלבד|woman only/i.test(text)) {
    return [AcceptedPartnerGender.FEMALE];
  }
  if (/גבר בלבד|מחפש גבר בלבד|מחפשת גבר בלבד|(^|[^a-z])man only/i.test(text)) {
    return [AcceptedPartnerGender.MALE];
  }
  throw new Error(`Cannot parse accepted genders: ${text.slice(0, 120)}`);
}

function parseReligionList(text: string): ReligionSelf[] {
  if (/חילוני בלבד|secular only/i.test(text)) {
    return [ReligionSelf.NONE];
  }
  const hasSecular = /חילוני|secular/i.test(text);
  const hasTrad = /מסורתי|traditional/i.test(text);
  const hasRel = /דתי|religious|moderately religious/i.test(text);
  const out = new Set<ReligionSelf>();
  if (hasSecular) out.add(ReligionSelf.NONE);
  if (hasTrad || hasRel) out.add(ReligionSelf.JEWISH);
  if (out.size === 0) throw new Error(`Cannot parse partner religions: ${text.slice(0, 120)}`);
  return [...out];
}

function parseSmokingPref(text: string): AcceptedPartnerSmoking {
  if (
    /ללא עישון|שלא יעשן|לא יעשן|מעדיף לא מעשנ|לא מעשן|no smoking|non-smoker|prefer non-smoker/i.test(text)
  ) {
    return AcceptedPartnerSmoking.NONE_ONLY;
  }
  return AcceptedPartnerSmoking.SOCIAL_OK;
}

function parseAlcoholPref(text: string): AcceptedPartnerAlcohol {
  if (
    /ללא אלכוהול|לא שותה|לא ישתה|prefer no alcohol|prefer no drinking|no alcohol|no drinking/i.test(text) ||
    /שלא תשתה|שלא ישתה/.test(text)
  ) {
    return AcceptedPartnerAlcohol.NONE_ONLY;
  }
  if (/שתייה חברתית|social drinking|wine|יין|כוס יין|moderate|light drinking/i.test(text)) {
    return AcceptedPartnerAlcohol.MODERATE_OK;
  }
  return AcceptedPartnerAlcohol.MODERATE_OK;
}

function parseMinEducation(text: string): MinimumPartnerEducation {
  if (/בגרות מלאה|high school diploma/i.test(text)) return MinimumPartnerEducation.HIGH_SCHOOL;
  if (/הנדסאי|vocational|תעודת מקצוע|certificate|diploma|post-secondary|על-תיכוני|סטודנט לתואר/i.test(text)) {
    return MinimumPartnerEducation.SOME_COLLEGE;
  }
  if (/תואר ראשון|תואר אקדמי|bachelor|college degree|תואר|degree or professional|teaching certificate/i.test(text)) {
    return MinimumPartnerEducation.BACHELORS;
  }
  return MinimumPartnerEducation.BACHELORS;
}

function parsePartnerHasChildren(text: string): PartnerHasChildrenAcceptance {
  if (
    /אין לי בעיה אם יש|אין בעיה אם יש ל(ו|ה)|בסדר אם יש|fine if (he|she) has|fine with existing kids/i.test(
      text,
    )
  ) {
    return PartnerHasChildrenAcceptance.ACCEPT;
  }
  if (
    /מישהו בלי ילדים|מעדיף בלי ילדים|מעדיפה בלי ילדים|מעדיפה ללא ילדים|ללא ילדים כרגע|בלי ילדים כרגע|prefer no kids|no kids yet|Prefer no kids now/i.test(
      text,
    )
  ) {
    return PartnerHasChildrenAcceptance.DOES_NOT_ACCEPT;
  }
  return PartnerHasChildrenAcceptance.NO_REQUIREMENT;
}

function parsePartnerWantsChildren(text: string): PartnerWantsChildrenRequirement {
  if (/לא מחפש(ת)? עוד ילדים|לא רוצה עוד ילדים|do not want more children|does not want more children/i.test(text)) {
    return PartnerWantsChildrenRequirement.MUST_NOT_WANT;
  }
  if (
    /רוצה ילדים|רוצה ילד בעתיד|ירצה עוד ילדים|want children|wants children|want one more child|wants kids/i.test(
      text,
    )
  ) {
    return PartnerWantsChildrenRequirement.MUST_WANT;
  }
  return PartnerWantsChildrenRequirement.NO_REQUIREMENT;
}

function inferSelfChildrenStatus(aboutMe: string): ChildrenStatusSelf {
  if (/גרושה עם|אמא ל|mom of one|divorced mom/i.test(aboutMe)) return ChildrenStatusSelf.YES_LIVES_WITH_ME;
  if (/אבא ל|dad of/i.test(aboutMe)) return ChildrenStatusSelf.YES_NOT_WITH_ME;
  return ChildrenStatusSelf.NO;
}

function inferSelfWantsChildren(aboutMe: string, aboutPartner: string): WantsChildrenSelf {
  if (/לא מחפש(ת)? עוד ילדים|לא רוצה עוד ילדים/i.test(aboutPartner)) return WantsChildrenSelf.NO;
  if (/do not want more children/i.test(aboutPartner)) return WantsChildrenSelf.NO;
  if (
    /רוצה ילדים|ילדים בעתיד|want children|wants children|want one more child|want kids later|wants kids/i.test(
      aboutPartner,
    )
  ) {
    return WantsChildrenSelf.YES;
  }
  return WantsChildrenSelf.UNSURE;
}

function inferSelfEducation(aboutMe: string): EducationLevelSelf {
  if (/סטודנט|student/i.test(aboutMe)) return EducationLevelSelf.SOME_COLLEGE;
  if (/מורה|teacher/i.test(aboutMe)) return EducationLevelSelf.BACHELORS;
  return EducationLevelSelf.BACHELORS;
}

function inferSelfReligion(aboutMe: string, aboutPartner: string): ReligionSelf {
  if (/חילוני בלבד|secular only/i.test(aboutPartner)) return ReligionSelf.NONE;
  if (/דתי|מסורתי|religious|traditional|ירושלים|Jerusalem|Netivot/i.test(aboutMe + aboutPartner)) {
    return ReligionSelf.JEWISH;
  }
  return ReligionSelf.NONE;
}

export function deriveHgGapStructuredLayers(row: {
  readonly id: string;
  readonly aboutMe: string;
  readonly aboutPartner: string;
}): DerivedHgGapStructured {
  if (!row.id.startsWith('synthetic-hg-gap-')) {
    throw new Error(`Expected synthetic-hg-gap id, got ${row.id}`);
  }
  const ap = row.aboutPartner ?? '';
  const am = row.aboutMe ?? '';
  const { gender, age } = parseSelfGenderAge(am, ap);
  const { min, max } = parsePartnerAgeRange(ap);

  const structuredPreferencesPatch: Record<string, unknown> = {
    acceptedPartnerGenders: parseAcceptedGenders(ap),
    partnerAgeMin: min,
    partnerAgeMax: max,
    acceptedPartnerReligions: parseReligionList(ap),
    acceptedPartnerSmoking: parseSmokingPref(ap),
    acceptedPartnerAlcohol: parseAlcoholPref(ap),
    minimumPartnerEducation: parseMinEducation(ap),
    partnerHasChildren: parsePartnerHasChildren(ap),
    partnerWantsChildren: parsePartnerWantsChildren(ap),
  };

  const structuredFactsPatch: Record<string, unknown> = {
    genderIdentity: gender,
    dateOfBirth: dobFromAge(age),
    childrenStatus: inferSelfChildrenStatus(am),
    wantsChildren: inferSelfWantsChildren(am, ap),
    smoking: SmokingFrequencySelf.NEVER,
    alcoholUse: AlcoholUseSelf.RARE,
    education: inferSelfEducation(am),
    religion: inferSelfReligion(am, ap),
  };

  return { structuredFactsPatch, structuredPreferencesPatch };
}
