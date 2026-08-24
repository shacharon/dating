import { getCopy } from '@/lib/i18n';
import type { MeProfilePhotoDto } from '@/lib/api/me-photos-api';

export function statusBadgeClass(status: MeProfilePhotoDto['status']): string {
  if (status === 'APPROVED') {
    return 'bg-emerald-800/90 text-white';
  }
  if (status === 'REJECTED') {
    return 'bg-red-800/90 text-white';
  }
  return 'bg-amber-600/90 text-white';
}

export function statusText(
  status: MeProfilePhotoDto['status'],
  copy: ReturnType<typeof getCopy>['photoModeration'],
): string {
  if (status === 'APPROVED') return copy.statusApproved;
  if (status === 'REJECTED') return copy.statusRejected;
  if (status === 'FLAGGED_FOR_REVIEW') return copy.statusFlagged;
  return copy.statusPending;
}
