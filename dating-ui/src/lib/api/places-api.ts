import { getApiBase } from '@/lib/api/api-base';
import { authenticatedFetch } from '@/lib/auth/authenticated-fetch';

export type PlaceCountry = { code: string; nameEn: string };
export type PlaceUsState = { code: string; nameEn: string; hasCities: boolean };
export type PlaceCity = { id: string; nameEn: string; nameHe: string | null };

async function getJson<T>(path: string): Promise<T> {
  const res = await authenticatedFetch(`${getApiBase()}${path}`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function listPlaceCountries() {
  return getJson<{ countries: PlaceCountry[] }>('/api/v1/places/countries');
}

export function listPlaceUsStates() {
  return getJson<{ states: PlaceUsState[] }>('/api/v1/places/us-states');
}

export function listPlaceCities(country: string, usState?: string) {
  const params = new URLSearchParams({ country });
  if (usState) params.set('usState', usState);
  return getJson<{ cities: PlaceCity[] }>(
    `/api/v1/places/cities?${params.toString()}`,
  );
}
