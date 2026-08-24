import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ageFromBirthInput } from '@/components/onboarding-basic-helpers';
import type { AppCopySchema } from '@/lib/i18n/types';
import type {
  MeProfilePhotoDto,
  MeProfilePhotoStatus,
} from '@/lib/api/me-photos-api';

export type GalleryDotKind = 'approved' | 'pending' | 'empty';

export function overviewDisplayName(draft: ProfileDraft): string {
  const nick = draft.nickname?.trim();
  return nick || '?';
}

export function overviewTitleLine(draft: ProfileDraft): string {
  const name = overviewDisplayName(draft);
  const age = ageFromBirthInput(draft.birthDate);
  return age != null ? `${name}, ${age}` : name;
}

export function overviewLocationLine(draft: ProfileDraft): string | null {
  const label = draft.locationLabel?.trim() || draft.city?.trim();
  return label || null;
}

export function overviewPartnerLine(
  genders: string[],
  genderCopy: AppCopySchema['gender'],
): string | null {
  if (genders.length === 0) return null;
  return genders
    .map((g) => genderCopy[g as keyof AppCopySchema['gender']] ?? g)
    .join(', ');
}

export function pickHeroPhoto(
  photos: MeProfilePhotoDto[],
): MeProfilePhotoDto | null {
  if (photos.length === 0) return null;
  return (
    photos.find((p) => p.isPrimary) ??
    photos.find((p) => p.status === 'APPROVED') ??
    photos[0] ??
    null
  );
}

function statusToDot(status: MeProfilePhotoStatus | undefined): GalleryDotKind {
  if (!status || status === 'REJECTED') return 'empty';
  if (status === 'APPROVED') return 'approved';
  return 'pending'; // PENDING | FLAGGED_FOR_REVIEW
}

/** Exactly 3 gallery dots from photo list order (pad with empty). */
export function galleryDotKinds(
  photos: MeProfilePhotoDto[],
  max = 3,
): GalleryDotKind[] {
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const kinds: GalleryDotKind[] = [];
  for (let i = 0; i < max; i++) {
    kinds.push(statusToDot(sorted[i]?.status));
  }
  return kinds;
}
