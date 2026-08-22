import { getApiBase } from '@/lib/api-base';
import { authenticatedFetch } from '@/lib/authenticated-fetch';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export type RejectionReasonCode =
  | 'no_face'
  | 'explicit_content'
  | 'low_quality'
  | 'not_real_person'
  | 'other';

export type PendingPhotoListItem = {
  id: string;
  profileId: string;
  userId: string;
  createdAt: string;
  mimeType: string;
  originalFileName: string | null;
  fileUrl: string;
  status: 'PENDING' | 'FLAGGED_FOR_REVIEW';
  mlConfidence: number | null;
  mlLabels: string[];
  moderationProvider: string | null;
};

export type ListPendingPhotosResponse = {
  items: PendingPhotoListItem[];
  nextCursor: string | null;
};

export type ModeratePhotoResponse = {
  id: string;
  profileId: string;
  status: string;
  rejectionReason: string | null;
  rejectionReasonCode?: RejectionReasonCode | null;
  isPrimary: boolean;
  updatedAt: string;
};

export async function listPendingPhotos(
  cursor?: string,
): Promise<ListPendingPhotosResponse> {
  const base = getApiBase();
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  const qs = params.toString();
  const res = await authenticatedFetch(`/api/v1/admin/photos/pending${qs ? `?${qs}` : ''}`,
    {
    headers: { Accept: 'application/json' } },
  );
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`GET admin photos pending failed: ${res.status}`);
  }
  return (await res.json()) as ListPendingPhotosResponse;
}

export async function moderatePhoto(
  photoId: string,
  decision: 'approve' | 'reject',
  options?: {
    rejectionReason?: string;
    rejectionReasonCode?: RejectionReasonCode;
  },
): Promise<ModeratePhotoResponse> {
  const base = getApiBase();
  const res = await authenticatedFetch(`/api/v1/admin/photos/${encodeURIComponent(photoId)}`, {
    method: 'PATCH',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      decision,
      ...(options?.rejectionReasonCode
        ? { rejectionReasonCode: options.rejectionReasonCode }
        : {}),
      ...(options?.rejectionReason?.trim()
        ? { rejectionReason: options.rejectionReason.trim() }
        : {}),
    }),
  });
  if (res.status === 403) {
    throw new Error('admin_forbidden');
  }
  if (!res.ok) {
    throw new Error(`PATCH admin photo failed: ${res.status}`);
  }
  return (await res.json()) as ModeratePhotoResponse;
}

export async function fetchAdminPhotoBlob(fileUrl: string): Promise<Blob> {
  const base = getApiBase();
  const path = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
  const res = await authenticatedFetch(path, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET admin photo file failed: ${res.status}`);
  }
  return res.blob();
}
