import type { ProfileDraft } from '@/app/dating/_lib/types';
import { ageFromBirthInput } from '@/components/onboarding-basic-helpers';
import type { AppCopySchema } from '@/lib/i18n/types';
import type {
  MeProfilePhotoDto,
  MeProfilePhotoStatus,
} from '@/lib/api/me-photos-api';

export type GalleryDotKind = 'approved' | 'pending' | 'empty';

export const OVERVIEW_PHOTO_SLOT_MAX = 3;

export function overviewDisplayName(draft: ProfileDraft): string | null {
  const nick = draft.nickname?.trim();
  return nick || null;
}

/** Name + age for the card overlay. Never returns a bare `?`. */
export function overviewTitleLine(
  draft: ProfileDraft,
  emptyNameLabel: string,
): string {
  const name = overviewDisplayName(draft);
  const age = ageFromBirthInput(draft.birthDate);
  if (name && age != null) return `${name}, ${age}`;
  if (name) return name;
  if (age != null) return String(age);
  return emptyNameLabel;
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

export function overviewStoryWordCount(draft: ProfileDraft): number {
  const text = [draft.aboutMe, draft.aboutPartner, draft.aboutRelationship]
    .map((s) => s?.trim() ?? '')
    .filter(Boolean)
    .join(' ');
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function overviewStoryIsEmpty(draft: ProfileDraft): boolean {
  return (
    !(draft.aboutMe?.trim() || '') &&
    !(draft.aboutPartner?.trim() || '') &&
    !(draft.aboutRelationship?.trim() || '')
  );
}

export type OverviewPhotoReview = 'none' | 'pending' | 'approved';

export function overviewPhotoStripSummary(
  photos: MeProfilePhotoDto[],
  max = OVERVIEW_PHOTO_SLOT_MAX,
): { filled: number; max: number; review: OverviewPhotoReview } {
  const filled = Math.min(photos.length, max);
  if (photos.length === 0) {
    return { filled: 0, max, review: 'none' };
  }
  const hasPending = photos.some(
    (p) =>
      p.status === 'PENDING' || p.status === 'FLAGGED_FOR_REVIEW',
  );
  const hasApproved = photos.some((p) => p.status === 'APPROVED');
  if (hasPending) return { filled, max, review: 'pending' };
  if (hasApproved) return { filled, max, review: 'approved' };
  return { filled, max, review: 'none' };
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

/** Exactly `max` gallery dots from photo list order (pad with empty). */
export function galleryDotKinds(
  photos: MeProfilePhotoDto[],
  max = OVERVIEW_PHOTO_SLOT_MAX,
): GalleryDotKind[] {
  const sorted = [...photos].sort((a, b) => a.position - b.position);
  const kinds: GalleryDotKind[] = [];
  for (let i = 0; i < max; i++) {
    kinds.push(statusToDot(sorted[i]?.status));
  }
  return kinds;
}

/** Apply `{count}` / `{filled}` / `{max}` placeholders in strip templates. */
export function formatOverviewTemplate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  );
}
