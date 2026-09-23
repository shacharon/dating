import {
  ME_PARTNER_GENDER_CHOICES,
  type MePartnerGenderChoice,
} from '@/lib/api/me-profile-api';

export type LookingForTile = 'men' | 'women' | 'everyone';

export function partnerGendersFromLookingFor(
  tile: LookingForTile,
): MePartnerGenderChoice[] {
  if (tile === 'men') return ['MALE'];
  if (tile === 'women') return ['FEMALE'];
  return [...ME_PARTNER_GENDER_CHOICES];
}

/** Infer tile from saved partner genders (for edit/resume). */
export function lookingForFromPartnerGenders(
  genders: readonly string[],
): LookingForTile | null {
  const set = new Set(genders);
  if (set.size === 1 && set.has('MALE')) return 'men';
  if (set.size === 1 && set.has('FEMALE')) return 'women';
  if (
    ME_PARTNER_GENDER_CHOICES.every((g) => set.has(g)) &&
    set.size === ME_PARTNER_GENDER_CHOICES.length
  ) {
    return 'everyone';
  }
  return null;
}
