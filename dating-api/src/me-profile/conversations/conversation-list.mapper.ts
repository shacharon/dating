import type { ConversationProfileRow } from '../repositories/conversation.repository.types';
import type { ConversationOtherUserDto } from './me-conversations.dto';

export function deriveAgeYears(birthDate: Date | null, asOf: Date): number | null {
  if (!birthDate) return null;
  const t = birthDate.getTime();
  if (Number.isNaN(t) || t > asOf.getTime()) return null;
  let age = asOf.getFullYear() - birthDate.getFullYear();
  const monthDiff = asOf.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && asOf.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function pickApprovedPrimaryPhotoId(
  photos: ReadonlyArray<{ id: string; isPrimary: boolean }>,
): string | null {
  const primary = photos.find((p) => p.isPrimary);
  return primary?.id ?? null;
}

export function buildOtherUserDto(
  otherUserId: string,
  profile: ConversationProfileRow | undefined,
  asOf: Date,
): ConversationOtherUserDto {
  const photoId = pickApprovedPrimaryPhotoId(profile?.photos ?? []);

  return {
    id: otherUserId,
    profileId: profile?.id ?? '',
    nickname: profile?.nickname?.trim() ? profile.nickname.trim() : null,
    gender: profile ? String(profile.gender) : null,
    ageYears: profile ? deriveAgeYears(profile.birthDate ?? null, asOf) : null,
    locationLabel: profile?.locationLabel ?? null,
    photoUrl:
      profile?.id && photoId
        ? `/api/v1/me/matches/${profile.id}/photos/${photoId}/file`
        : null,
  };
}
