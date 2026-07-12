/**
 * Minimal fetch client for dating-api UserProfile CRUD (/api/v1/user-profiles).
 */

import { apiUrl } from '@/lib/api-base';

const JSON_HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json' };

export interface UserProfileDto {
  id: string;
  name: string;
  aboutMe: string;
  aboutPartner: string | null;
  aboutRelationship: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserProfilePayload {
  name: string;
  aboutMe: string;
  aboutPartner?: string;
  aboutRelationship?: string;
}

export interface UpdateUserProfilePayload {
  name?: string;
  aboutMe?: string;
  aboutPartner?: string | null;
  aboutRelationship?: string | null;
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export async function listProfiles(): Promise<UserProfileDto[]> {
  const res = await fetch(apiUrl('/api/v1/user-profiles'), {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`listProfiles failed: ${res.status} ${res.statusText}`);
  }
  return readJson<UserProfileDto[]>(res);
}

export async function getProfile(id: string): Promise<UserProfileDto | null> {
  const res = await fetch(
    apiUrl(`/api/v1/user-profiles/${encodeURIComponent(id)}`),
    { cache: 'no-store', headers: { Accept: 'application/json' } },
  );
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`getProfile failed: ${res.status} ${res.statusText}`);
  }
  return readJson<UserProfileDto>(res);
}

export async function createProfile(
  payload: CreateUserProfilePayload,
): Promise<UserProfileDto> {
  const res = await fetch(apiUrl('/api/v1/user-profiles'), {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `createProfile failed: ${res.status} ${body || res.statusText}`,
    );
  }
  return readJson<UserProfileDto>(res);
}

export async function updateProfile(
  id: string,
  payload: UpdateUserProfilePayload,
): Promise<UserProfileDto> {
  const res = await fetch(
    apiUrl(`/api/v1/user-profiles/${encodeURIComponent(id)}`),
    {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify(payload),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `updateProfile failed: ${res.status} ${body || res.statusText}`,
    );
  }
  return readJson<UserProfileDto>(res);
}

export async function deleteProfile(id: string): Promise<void> {
  const res = await fetch(
    apiUrl(`/api/v1/user-profiles/${encodeURIComponent(id)}`),
    { method: 'DELETE' },
  );
  if (res.status === 404) {
    throw new Error('deleteProfile: not found');
  }
  if (!res.ok) {
    throw new Error(`deleteProfile failed: ${res.status} ${res.statusText}`);
  }
}
