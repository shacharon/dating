import { AcceptedPartnerGender } from '../canonical/matching-canonical.types';
import { ageWholeYearsUtcFromYmd } from '../holy-grail-matching/holy-grail-dob-ymd';
import {
  addUtcCalendarDays,
  addUtcCalendarYears,
  ageYearsAtAsOfForBirthDate,
  birthDateBoundsForPartnerAgePrefs,
  buildMatchCandidateSqlPrefilterWhere,
  isMatchListPrefRowEmpty,
} from './me-matches-candidate-sql-prefilter';

describe('me-matches-candidate-sql-prefilter', () => {
  const asOf = new Date('2026-08-01T15:30:00.000Z');

  describe('isMatchListPrefRowEmpty', () => {
    it('is true when all preference fields are null/empty', () => {
      expect(
        isMatchListPrefRowEmpty({
          partnerAgeMin: null,
          partnerAgeMax: null,
          maxDistanceKm: null,
          acceptedPartnerGenders: [],
        }),
      ).toBe(true);
    });

    it('is false when any preference field is set', () => {
      expect(
        isMatchListPrefRowEmpty({
          partnerAgeMin: 25,
          partnerAgeMax: null,
          maxDistanceKm: null,
          acceptedPartnerGenders: [],
        }),
      ).toBe(false);
      expect(
        isMatchListPrefRowEmpty({
          partnerAgeMin: null,
          partnerAgeMax: null,
          maxDistanceKm: null,
          acceptedPartnerGenders: ['FEMALE'],
        }),
      ).toBe(false);
    });
  });

  describe('buildMatchCandidateSqlPrefilterWhere', () => {
    it('returns empty fragments for open prefs (no gender, no preference row)', () => {
      expect(
        buildMatchCandidateSqlPrefilterWhere({
          acceptedPartnerGenders: null,
          preference: null,
          asOf,
        }),
      ).toEqual({});
    });

    it('returns empty fragments for empty allowlist and empty preference row', () => {
      expect(
        buildMatchCandidateSqlPrefilterWhere({
          acceptedPartnerGenders: [],
          preference: {
            partnerAgeMin: null,
            partnerAgeMax: null,
            maxDistanceKm: null,
            acceptedPartnerGenders: [],
          },
          asOf,
        }),
      ).toEqual({});
    });

    it('adds gender in-clause when allowlist is non-empty', () => {
      expect(
        buildMatchCandidateSqlPrefilterWhere({
          acceptedPartnerGenders: [
            AcceptedPartnerGender.FEMALE,
            AcceptedPartnerGender.OTHER,
          ],
          preference: null,
          asOf,
        }),
      ).toEqual({
        gender: { in: ['FEMALE', 'OTHER'] },
      });
    });

    it('adds age bounds for min-only on a non-empty preference row', () => {
      const where = buildMatchCandidateSqlPrefilterWhere({
        acceptedPartnerGenders: null,
        preference: {
          partnerAgeMin: 25,
          partnerAgeMax: null,
          maxDistanceKm: null,
          acceptedPartnerGenders: [],
        },
        asOf,
      });
      expect(where.gender).toBeUndefined();
      expect(where.birthDate).toEqual({
        not: null,
        lte: new Date(Date.UTC(2001, 7, 1)),
      });
    });

    it('adds age bounds for max-only on a non-empty preference row', () => {
      const where = buildMatchCandidateSqlPrefilterWhere({
        acceptedPartnerGenders: null,
        preference: {
          partnerAgeMin: null,
          partnerAgeMax: 40,
          maxDistanceKm: null,
          acceptedPartnerGenders: [],
        },
        asOf,
      });
      expect(where.birthDate).toEqual({
        not: null,
        gte: new Date(Date.UTC(1985, 7, 2)),
      });
    });

    it('adds gender and age when both are configured', () => {
      const where = buildMatchCandidateSqlPrefilterWhere({
        acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
        preference: {
          partnerAgeMin: 25,
          partnerAgeMax: 40,
          maxDistanceKm: null,
          acceptedPartnerGenders: ['FEMALE'],
        },
        asOf,
      });
      expect(where).toEqual({
        gender: { in: ['FEMALE'] },
        birthDate: {
          not: null,
          gte: new Date(Date.UTC(1985, 7, 2)),
          lte: new Date(Date.UTC(2001, 7, 1)),
        },
      });
    });

    it('omits age when preference row is empty even if ages were somehow ignored', () => {
      // Empty row → omit age (architect: useNormalizedPrefs false).
      expect(
        buildMatchCandidateSqlPrefilterWhere({
          acceptedPartnerGenders: null,
          preference: {
            partnerAgeMin: null,
            partnerAgeMax: null,
            maxDistanceKm: null,
            acceptedPartnerGenders: [],
          },
          asOf,
        }),
      ).toEqual({});
    });

    it('omits age when non-empty row has genders but no age prefs', () => {
      expect(
        buildMatchCandidateSqlPrefilterWhere({
          acceptedPartnerGenders: [AcceptedPartnerGender.FEMALE],
          preference: {
            partnerAgeMin: null,
            partnerAgeMax: null,
            maxDistanceKm: null,
            acceptedPartnerGenders: ['FEMALE'],
          },
          asOf,
        }),
      ).toEqual({
        gender: { in: ['FEMALE'] },
      });
    });
  });

  describe('birthDateBoundsForPartnerAgePrefs vs ageWholeYearsUtcFromYmd', () => {
    const min = 25;
    const max = 40;
    const bounds = birthDateBoundsForPartnerAgePrefs(asOf, min, max);

    it('documents architect examples for asOf 2026-08-01', () => {
      expect(bounds.lte).toEqual(new Date(Date.UTC(2001, 7, 1)));
      expect(bounds.gte).toEqual(new Date(Date.UTC(1985, 7, 2)));
    });

    it('includes DOB on the min-age birthday and excludes the day after', () => {
      const onMin = new Date(Date.UTC(2001, 7, 1));
      const afterMin = new Date(Date.UTC(2001, 7, 2));
      expect(ageYearsAtAsOfForBirthDate(onMin, asOf)).toBe(25);
      expect(ageYearsAtAsOfForBirthDate(afterMin, asOf)).toBe(24);
      expect(onMin.getTime()).toBeLessThanOrEqual(bounds.lte!.getTime());
      expect(afterMin.getTime()).toBeGreaterThan(bounds.lte!.getTime());
    });

    it('includes DOB on the max-age edge and excludes one day older', () => {
      const onMax = new Date(Date.UTC(1985, 7, 2));
      const tooOld = new Date(Date.UTC(1985, 7, 1));
      expect(ageYearsAtAsOfForBirthDate(onMax, asOf)).toBe(40);
      expect(ageYearsAtAsOfForBirthDate(tooOld, asOf)).toBe(41);
      expect(onMax.getTime()).toBeGreaterThanOrEqual(bounds.gte!.getTime());
      expect(tooOld.getTime()).toBeLessThan(bounds.gte!.getTime());
    });

    it('keeps every DOB in [gte,lte] within [min,max] whole years', () => {
      for (const ymd of [
        '1985-08-02',
        '1990-01-01',
        '2001-08-01',
        '1995-12-31',
      ]) {
        const age = ageWholeYearsUtcFromYmd(ymd, asOf)!;
        expect(age).toBeGreaterThanOrEqual(min);
        expect(age).toBeLessThanOrEqual(max);
        const dob = new Date(`${ymd}T00:00:00.000Z`);
        expect(dob.getTime()).toBeGreaterThanOrEqual(bounds.gte!.getTime());
        expect(dob.getTime()).toBeLessThanOrEqual(bounds.lte!.getTime());
      }
    });
  });

  describe('addUtcCalendarYears', () => {
    it('clamps Feb 29 into a non-leap year', () => {
      const leap = new Date(Date.UTC(2024, 1, 29));
      expect(addUtcCalendarYears(leap, 1)).toEqual(new Date(Date.UTC(2025, 1, 28)));
    });

    it('addUtcCalendarDays moves by calendar day in UTC', () => {
      expect(addUtcCalendarDays(new Date(Date.UTC(1985, 7, 1)), 1)).toEqual(
        new Date(Date.UTC(1985, 7, 2)),
      );
    });
  });
});
