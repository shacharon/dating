import {
  anyChildrenUnsure,
  applyChildrenUnsurePenalty,
  getDisplayScore,
} from './children-unsure.helpers';
import { CHILDREN_UNSURE_RANKING_PENALTY_RATE } from './children-unsure.product-policy';
import { parseHideChildrenUnsure } from './children-unsure.query';

describe('children_unsure hardening', () => {
  describe('applyChildrenUnsurePenalty', () => {
    it('rounds engine score when no penalty', () => {
      expect(applyChildrenUnsurePenalty(77.4, false)).toBe(77);
      expect(applyChildrenUnsurePenalty(80, false)).toBe(80);
    });

    it('applies configured multiplicative penalty when flag true', () => {
      const rate = CHILDREN_UNSURE_RANKING_PENALTY_RATE;
      expect(applyChildrenUnsurePenalty(100, true)).toBe(Math.round(100 * (1 - rate)));
      expect(applyChildrenUnsurePenalty(80, true)).toBe(Math.round(80 * (1 - rate)));
    });
  });

  describe('anyChildrenUnsure', () => {
    it('is false when absent or both false', () => {
      expect(anyChildrenUnsure(undefined)).toBe(false);
      expect(
        anyChildrenUnsure({ profile_a_to_profile_b: false, profile_b_to_profile_a: false }),
      ).toBe(false);
    });

    it('is true if either direction true', () => {
      expect(
        anyChildrenUnsure({ profile_a_to_profile_b: true, profile_b_to_profile_a: false }),
      ).toBe(true);
      expect(
        anyChildrenUnsure({ profile_a_to_profile_b: false, profile_b_to_profile_a: true }),
      ).toBe(true);
    });
  });

  describe('list filter parity', () => {
    it('matches prior predicate: hide removes any row with either direction true', () => {
      const rows = [
        {
          id: 'a',
          cu: { profile_a_to_profile_b: false, profile_b_to_profile_a: false },
        },
        {
          id: 'b',
          cu: { profile_a_to_profile_b: true, profile_b_to_profile_a: false },
        },
        {
          id: 'c',
          cu: { profile_a_to_profile_b: false, profile_b_to_profile_a: true },
        },
      ];
      const filtered = rows.filter((r) => !anyChildrenUnsure(r.cu));
      expect(filtered.map((r) => r.id)).toEqual(['a']);
    });
  });

  describe('getDisplayScore', () => {
    it('prefers rankingScore then finalScore then overall', () => {
      expect(getDisplayScore({ overall: 50, finalScore: 60, rankingScore: 55 })).toBe(55);
      expect(getDisplayScore({ overall: 50, finalScore: 60 })).toBe(60);
      expect(getDisplayScore({ overall: 50 })).toBe(50);
    });
  });

  describe('parseHideChildrenUnsure', () => {
    it('defaults false', () => {
      expect(parseHideChildrenUnsure(undefined)).toBe(false);
      expect(parseHideChildrenUnsure('')).toBe(false);
    });

    it('accepts 1 true yes case-insensitively', () => {
      expect(parseHideChildrenUnsure('1')).toBe(true);
      expect(parseHideChildrenUnsure('TRUE')).toBe(true);
      expect(parseHideChildrenUnsure('yes')).toBe(true);
    });

    it('rejects other strings', () => {
      expect(parseHideChildrenUnsure('false')).toBe(false);
      expect(parseHideChildrenUnsure('0')).toBe(false);
    });
  });
});
