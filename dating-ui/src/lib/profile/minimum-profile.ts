import type { MeProfileDto } from '@/lib/api-types/profile';

/**
 * Gender, who they want, a location, and a birth date.
 * Story and photos are not required.
 */
export function hasMinimumProfileFacts(
  profile: MeProfileDto | null | undefined,
): boolean {
  if (!profile) return false;
  const gender = profile.gender;
  const partners = (profile.desiredPartnerGenders ?? []).filter(
    (g) => g && g !== 'PREFER_NOT_TO_SAY',
  );
  const location = Boolean(
    profile.city?.trim() ||
      profile.country?.trim() ||
      profile.locationLabel?.trim() ||
      profile.cityId,
  );
  const birth = Boolean(profile.birthDate?.trim());
  return Boolean(
    gender &&
      gender !== 'PREFER_NOT_TO_SAY' &&
      partners.length > 0 &&
      location &&
      birth,
  );
}
