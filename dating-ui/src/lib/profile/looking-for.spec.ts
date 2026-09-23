import { describe, expect, it } from 'vitest';
import {
  lookingForFromPartnerGenders,
  partnerGendersFromLookingFor,
} from '@/lib/profile/looking-for';

describe('looking-for', () => {
  it('maps tiles to partner gender sets', () => {
    expect(partnerGendersFromLookingFor('men')).toEqual(['MALE']);
    expect(partnerGendersFromLookingFor('women')).toEqual(['FEMALE']);
    expect(partnerGendersFromLookingFor('everyone')).toEqual([
      'MALE',
      'FEMALE',
      'NON_BINARY',
      'OTHER',
    ]);
  });

  it('infers tile from saved partners', () => {
    expect(lookingForFromPartnerGenders(['MALE'])).toBe('men');
    expect(lookingForFromPartnerGenders(['FEMALE'])).toBe('women');
    expect(
      lookingForFromPartnerGenders(['MALE', 'FEMALE', 'NON_BINARY', 'OTHER']),
    ).toBe('everyone');
    expect(lookingForFromPartnerGenders(['MALE', 'FEMALE'])).toBeNull();
  });
});
