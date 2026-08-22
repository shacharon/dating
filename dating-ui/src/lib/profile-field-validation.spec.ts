import { describe, expect, it } from 'vitest';
import {
  validateGenderForOnboardingAdvance,
  validatePartnerGendersNonEmpty,
} from '@/lib/profile-field-validation';

describe('profile-field-validation', () => {
  describe('validateGenderForOnboardingAdvance', () => {
    it('rejects empty gender', () => {
      expect(validateGenderForOnboardingAdvance('')).toEqual({
        ok: false,
        error: 'genderInvalidForAdvance',
      });
      expect(validateGenderForOnboardingAdvance('   ')).toEqual({
        ok: false,
        error: 'genderInvalidForAdvance',
      });
    });

    it('rejects PREFER_NOT_TO_SAY', () => {
      expect(validateGenderForOnboardingAdvance('PREFER_NOT_TO_SAY')).toEqual({
        ok: false,
        error: 'genderInvalidForAdvance',
      });
    });

    it('accepts a selected gender', () => {
      expect(validateGenderForOnboardingAdvance('MALE')).toEqual({ ok: true });
    });
  });

  describe('validatePartnerGendersNonEmpty', () => {
    it('rejects empty list', () => {
      expect(validatePartnerGendersNonEmpty([])).toEqual({
        ok: false,
        error: 'partnerGendersRequired',
      });
    });

    it('accepts at least one gender', () => {
      expect(validatePartnerGendersNonEmpty(['FEMALE'])).toEqual({ ok: true });
    });
  });
});
