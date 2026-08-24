/**
 * Authenticated profile photo operations: upload/list/delete/reorder (session cookie).
 */

import { getApiBase } from '@/lib/api/api-base';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';
import { captureRequestIdFromResponse } from '@/lib/observability/request-id';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

function apiUnreachableMessage(base: string, path: string): string {
  const hint =
    base === ""
      ? 'Start dating-api on port 3001 (or set API_PROXY_TARGET in next.config env). Requests use same-origin /api via Next rewrites.'
      : 'Start dating-api, confirm NEXT_PUBLIC_API_URL, and if the UI uses another hostname than the API, add that origin to dating-api CORS_ORIGIN.';
  return `Network error calling ${base || "(same-origin)"}${path}. ${hint}`;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

// ─── Photo Types ──────────────────────────────────────────────────────────────

export type MeProfilePhotoStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'FLAGGED_FOR_REVIEW';

export interface MeProfilePhotoDto {
  id: string;
  profileId: string;
  storageKey: string;
  originalFileName: string | null;
  mimeType: string;
  sizeBytes: number;
  position: number;
  isPrimary: boolean;
  status: MeProfilePhotoStatus;
  moderationProvider: string | null;
  moderationResultJson: unknown | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Photo API Functions ──────────────────────────────────────────────────────

/**
 * Returns all photos for the authenticated user's profile.
 */
export async function listMyProfilePhotos(): Promise<MeProfilePhotoDto[]> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/photos';
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return readJson<MeProfilePhotoDto[]>(res);
}

/**
 * Uploads a new photo to the authenticated user's profile.
 */
export async function uploadMyProfilePhoto(file: File): Promise<MeProfilePhotoDto> {
  const base = getApiBase();
  const path = '/api/v1/me/profile/photos';
  const form = new FormData();
  form.append('file', file);
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'POST',
    body: form,
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `POST ${path} failed: ${res.status} ${errText || res.statusText}`,
    );
  }
  return readJson<MeProfilePhotoDto>(res);
}

/**
 * Deletes a photo from the authenticated user's profile.
 */
export async function deleteMyProfilePhoto(photoId: string): Promise<void> {
  const base = getApiBase();
  const path = `/api/v1/me/profile/photos/${encodeURIComponent(photoId)}`;
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `DELETE ${path} failed: ${res.status} ${errText || res.statusText}`,
    );
  }
}

/**
 * Sets a photo as the primary photo for the authenticated user's profile.
 */
export async function setPrimaryMyProfilePhoto(
  photoId: string,
): Promise<MeProfilePhotoDto> {
  const base = getApiBase();
  const path = `/api/v1/me/profile/photos/${encodeURIComponent(photoId)}/primary`;
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: '{}',
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(
      `PATCH ${path} failed: ${res.status} ${errText || res.statusText}`,
    );
  }
  return readJson<MeProfilePhotoDto>(res);
}

/**
 * Fetches the image blob for a photo by its ID.
 */
export async function fetchMyProfilePhotoBlob(photoId: string): Promise<Blob> {
  const base = getApiBase();
  const path = `/api/v1/me/profile/photos/${encodeURIComponent(photoId)}/file`;
  let res: Response;
  try {
    res = await authenticatedFetch(path, {
      method: 'GET',
      cache: 'no-store',
    });
  } catch {
    throw new Error(apiUnreachableMessage(base, path));
  }
  captureRequestIdFromResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.blob();
}
