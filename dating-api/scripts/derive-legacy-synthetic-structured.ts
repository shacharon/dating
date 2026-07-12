/**
 * Deterministic structured HG for legacy `synthetic-he-*` / `synthetic-en-*` rows from
 * `profiles-combined.json` fields only (no validation-time inference).
 */

import {
  AcceptedPartnerGender,
  AlcoholUseSelf,
  ChildrenStatusSelf,
  EducationLevelSelf,
  GenderIdentity,
  ReligionSelf,
  SmokingFrequencySelf,
  WantsChildrenSelf,
} from '../src/canonical/matching-canonical.types';

export interface DerivedLegacyStructured {
  readonly structuredFactsPatch: Record<string, unknown>;
  readonly structuredPreferencesPatch: Record<string, unknown>;
}

function dobFromAge(age: number): string {
  const y = 2026 - age;
  return `${String(y).padStart(4, '0')}-06-15`;
}

/** English profiles omit בת/בן — gender is fixed from authored role cues in aboutMe / aboutPartner. */
const EN_SELF_GENDER: Readonly<Record<string, GenderIdentity>> = {
  'synthetic-en-001': GenderIdentity.MALE,
  'synthetic-en-002': GenderIdentity.FEMALE,
  'synthetic-en-003': GenderIdentity.MALE,
  'synthetic-en-004': GenderIdentity.FEMALE,
  'synthetic-en-005': GenderIdentity.MALE,
  'synthetic-en-006': GenderIdentity.FEMALE,
  'synthetic-en-007': GenderIdentity.MALE,
  'synthetic-en-008': GenderIdentity.FEMALE,
  'synthetic-en-009': GenderIdentity.MALE,
  'synthetic-en-010': GenderIdentity.FEMALE,
  'synthetic-en-011': GenderIdentity.MALE,
  'synthetic-en-012': GenderIdentity.FEMALE,
  'synthetic-en-013': GenderIdentity.MALE,
  'synthetic-en-014': GenderIdentity.FEMALE,
  'synthetic-en-015': GenderIdentity.MALE,
  'synthetic-en-016': GenderIdentity.FEMALE,
  'synthetic-en-017': GenderIdentity.MALE,
  'synthetic-en-018': GenderIdentity.MALE,
  'synthetic-en-019': GenderIdentity.MALE,
  'synthetic-en-020': GenderIdentity.FEMALE,
};

function parseHebrewSelf(aboutMe: string): { gender: GenderIdentity; age: number } {
  const m = aboutMe.match(/^(בת|בן)\s+(\d+)/);
  if (!m) throw new Error(`Legacy HE: expected בת/בן age in aboutMe: ${aboutMe.slice(0, 60)}`);
  return {
    gender: m[1] === 'בת' ? GenderIdentity.FEMALE : GenderIdentity.MALE,
    age: Number(m[2]),
  };
}

function parseEnglishSelf(id: string, aboutMe: string): { gender: GenderIdentity; age: number } {
  const m = aboutMe.match(/^(\d+),/);
  if (!m) throw new Error(`Legacy EN: expected leading age in aboutMe: ${aboutMe.slice(0, 60)}`);
  const g = EN_SELF_GENDER[id];
  if (!g) throw new Error(`Legacy EN: missing self gender map for ${id}`);
  return { gender: g, age: Number(m[1]) };
}

function inferChildrenStatus(aboutMe: string): ChildrenStatusSelf {
  if (/ילדה אחת|אמא לילד|אמא ל|mom of one|mom of/i.test(aboutMe)) return ChildrenStatusSelf.YES_LIVES_WITH_ME;
  if (/אבא לשני|אבא ל|dad of/i.test(aboutMe)) return ChildrenStatusSelf.YES_NOT_WITH_ME;
  return ChildrenStatusSelf.NO;
}

function inferWantsChildren(aboutMe: string, aboutPartner: string): WantsChildrenSelf {
  const t = `${aboutMe} ${aboutPartner}`;
  if (/נישואים|בית ומשפחה|family life|marriage-minded|משפחה/i.test(t)) return WantsChildrenSelf.YES;
  if (/גרוש בלי ילדים|no kids/i.test(aboutMe)) return WantsChildrenSelf.UNSURE;
  return WantsChildrenSelf.UNSURE;
}

function inferSelfSmoking(aboutMe: string, aboutPartner: string): SmokingFrequencySelf {
  const t = `${aboutMe} ${aboutPartner}`;
  if (/ברמן|bartend/i.test(t)) return SmokingFrequencySelf.SOCIAL;
  return SmokingFrequencySelf.NEVER;
}

function inferSelfAlcohol(aboutMe: string): AlcoholUseSelf {
  if (/פחות בקטע של אלכוהול|לא שותה הרבה/i.test(aboutMe)) return AlcoholUseSelf.RARE;
  if (/ברמן|bartend/i.test(aboutMe)) return AlcoholUseSelf.MODERATE;
  return AlcoholUseSelf.RARE;
}

function inferSelfEducation(aboutMe: string): EducationLevelSelf {
  if (/סטודנטית|סטודנט|grad student/i.test(aboutMe)) return EducationLevelSelf.SOME_COLLEGE;
  if (/מורה|teacher|עורכת דין|attorney|פסיכולוגית|therapist/i.test(aboutMe)) return EducationLevelSelf.BACHELORS;
  if (/מהנדס|engineer|מפתחת תוכנה/i.test(aboutMe)) return EducationLevelSelf.BACHELORS;
  return EducationLevelSelf.BACHELORS;
}

function inferSelfReligion(aboutMe: string): ReligionSelf {
  if (/חילונית|חילוני מסורתי/i.test(aboutMe)) return ReligionSelf.NONE;
  if (/דתייה|מסורתית|faith is part of my life|traditional in daily life/i.test(aboutMe)) return ReligionSelf.JEWISH;
  return ReligionSelf.JEWISH;
}

function partnerAgeBand(selfAge: number, aboutPartner: string): { min: number; max: number } | undefined {
  if (
    /בערך בגיל|בגיל דומה|בטווח גילאים|בגיל קרוב|around my age|close in age|similar age range|near my age|similar age/i.test(
      aboutPartner,
    )
  ) {
    return { min: Math.max(18, selfAge - 5), max: Math.min(75, selfAge + 5) };
  }
  if (/באזור שלי|close-ish in age/i.test(aboutPartner)) {
    return { min: Math.max(18, selfAge - 7), max: Math.min(75, selfAge + 7) };
  }
  return undefined;
}

function partnerGenders(selfGender: GenderIdentity, aboutPartner: string): AcceptedPartnerGender[] {
  const t = aboutPartner;
  if (/מישהי|מחפש מישהי|מעדיף מישהי|מחפש אישה|אישה נעימה|אישה נשית/i.test(t)) return [AcceptedPartnerGender.FEMALE];
  if (/מחפשת גבר|מחפש גבר|גבר יציב|גבר טוב|גבר תקשורתי|גבר אינטליגנטי|גבר עם יראת|מחפשת מישהו|מחפש מישהו בוגר/i.test(t)) {
    return [AcceptedPartnerGender.MALE];
  }
  if (/Looking for a (grounded )?woman|kind woman|Warm, mature woman|feminine energy|his shoulders/i.test(t)) {
    return [AcceptedPartnerGender.FEMALE];
  }
  if (/family-oriented man|values-driven man|stable guy|mature man/i.test(t)) return [AcceptedPartnerGender.MALE];
  if (/comfortable dating a parent/i.test(t)) return [AcceptedPartnerGender.MALE];
  return selfGender === GenderIdentity.FEMALE
    ? [AcceptedPartnerGender.MALE]
    : [AcceptedPartnerGender.FEMALE];
}

export function deriveLegacySyntheticStructuredLayers(row: {
  readonly id: string;
  readonly aboutMe: string;
  readonly aboutPartner: string;
}): DerivedLegacyStructured {
  const am = row.aboutMe ?? '';
  const ap = row.aboutPartner ?? '';

  const { gender, age } = row.id.startsWith('synthetic-he-')
    ? parseHebrewSelf(am)
    : parseEnglishSelf(row.id, am);

  const structuredFactsPatch: Record<string, unknown> = {
    genderIdentity: gender,
    dateOfBirth: dobFromAge(age),
    childrenStatus: inferChildrenStatus(am),
    wantsChildren: inferWantsChildren(am, ap),
    smoking: inferSelfSmoking(am, ap),
    alcoholUse: inferSelfAlcohol(am),
    education: inferSelfEducation(am),
    religion: inferSelfReligion(am),
  };

  const structuredPreferencesPatch: Record<string, unknown> = {};
  const band = partnerAgeBand(age, ap);
  if (band) {
    structuredPreferencesPatch.partnerAgeMin = band.min;
    structuredPreferencesPatch.partnerAgeMax = band.max;
  }
  structuredPreferencesPatch.acceptedPartnerGenders = partnerGenders(gender, ap);

  return { structuredFactsPatch, structuredPreferencesPatch };
}
