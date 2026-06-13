import { getApiBase } from '@/lib/api-base';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

export type PendingPhotoListItem = {
  id: string;
  profileId: string;
  userId: string;
  createdAt: string;
  mimeType: string;
  originalFileName: string | null;
  fileUrl: string;
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
  const res = await fetch(
    `${base}/api/v1/admin/photos/pending${qs ? `?${qs}` : ''}`,
    { credentials: 'include', headers: { Accept: 'application/json' } },
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
  rejectionReason?: string,
): Promise<ModeratePhotoResponse> {
  const base = getApiBase();
  const res = await fetch(`${base}/api/v1/admin/photos/${encodeURIComponent(photoId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      decision,
      ...(rejectionReason?.trim() ? { rejectionReason: rejectionReason.trim() } : {}),
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
  const res = await fetch(`${base}${path}`, { credentials: 'include' });
  if (!res.ok) {
    throw new Error(`GET admin photo file failed: ${res.status}`);
  }
  return res.blob();
}
