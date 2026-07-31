import type { ProfileGender, Prisma } from '@prisma/client';
import type { AcceptedPartnerGender } from '../canonical/matching-canonical.types';
import { ageWholeYearsUtcFromYmd } from '../holy-grail-matching/holy-grail-dob-ymd';

/**
 * Preference-row emptiness for match-list SQL age gating — same fields as
 * `isPrefRowEmpty` in `me-profile-engine.mapper.ts` (HG useNormalizedPrefs).
 */
export function isMatchListPrefRowEmpty(pref: {
  partnerAgeMin: number | null;
  partnerAgeMax: number | null;
  maxDistanceKm: number | null;
  acceptedPartnerGenders: readonly string[];
}): boolean {
  return (
    pref.partnerAgeMin === null &&
    pref.partnerAgeMax === null &&
    pref.maxDistanceKm === null &&
    pref.acceptedPartnerGenders.length === 0
  );
}

/** Add whole calendar years in UTC; clamp day for short months (e.g. Feb 29 → 28). */
export function addUtcCalendarYears(asOf: Date, years: number): Date {
  const y = asOf.getUTCFullYear() + years;
  const m = asOf.getUTCMonth();
  const d = asOf.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d, lastDay)));
}

export function addUtcCalendarDays(date: Date, days: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days),
  );
}

/**
 * BirthDate bounds so `ageWholeYearsUtcFromYmd(dobYmd, asOf)` stays within
 * [partnerAgeMin, partnerAgeMax] when those bounds are set (UTC calendar).
 */
export function birthDateBoundsForPartnerAgePrefs(
  asOf: Date,
  partnerAgeMin: number | null,
  partnerAgeMax: number | null,
): { gte?: Date; lte?: Date } {
  const out: { gte?: Date; lte?: Date } = {};
  if (partnerAgeMin !== null) {
    out.lte = addUtcCalendarYears(asOf, -partnerAgeMin);
  }
  if (partnerAgeMax !== null) {
    out.gte = addUtcCalendarDays(
      addUtcCalendarYears(asOf, -(partnerAgeMax + 1)),
      1,
    );
  }
  return out;
}

export type MatchCandidateSqlPrefilterInput = {
  /** Product allowlist from viewer bridge (`null` / empty → omit gender clause). */
  acceptedPartnerGenders: readonly AcceptedPartnerGender[] | null;
  /**
   * Viewer preference row when present. Age SQL applies only when the row is
   * non-empty (HG useNormalizedPrefs) and min and/or max is set.
   */
  preference: {
    partnerAgeMin: number | null;
    partnerAgeMax: number | null;
    maxDistanceKm: number | null;
    acceptedPartnerGenders: readonly string[];
  } | null;
  asOf: Date;
};

/**
 * Optional Prisma `where` fragments for viewer→candidate gender/age prefilter.
 * Reciprocal gender is intentionally not expressed here (evaluated in memory).
 */
export function buildMatchCandidateSqlPrefilterWhere(
  input: MatchCandidateSqlPrefilterInput,
): Pick<Prisma.UserProfileWhereInput, 'gender' | 'birthDate'> {
  const where: Pick<Prisma.UserProfileWhereInput, 'gender' | 'birthDate'> = {};

  const allow = input.acceptedPartnerGenders;
  if (allow != null && allow.length > 0) {
    where.gender = {
      in: [...allow] as ProfileGender[],
    };
  }

  const pref = input.preference;
  if (pref != null && !isMatchListPrefRowEmpty(pref)) {
    const ageMin = pref.partnerAgeMin;
    const ageMax = pref.partnerAgeMax;
    if (ageMin !== null || ageMax !== null) {
      const bounds = birthDateBoundsForPartnerAgePrefs(
        input.asOf,
        ageMin,
        ageMax,
      );
      where.birthDate = {
        not: null,
        ...(bounds.gte !== undefined ? { gte: bounds.gte } : {}),
        ...(bounds.lte !== undefined ? { lte: bounds.lte } : {}),
      };
    }
  }

  return where;
}

/** Test helper: whole-years age for a UTC midnight DOB Date at `asOf`. */
export function ageYearsAtAsOfForBirthDate(
  birthDate: Date,
  asOf: Date,
): number | undefined {
  return ageWholeYearsUtcFromYmd(
    birthDate.toISOString().slice(0, 10),
    asOf,
  );
}
