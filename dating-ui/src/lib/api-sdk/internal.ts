export const JSON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
} as const;

export async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

/** Conversations list endpoints treat empty bodies as `{}`. */
export async function readJsonOrEmptyObject<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

export function apiUnreachableMessage(base: string, path: string): string {
  const hint =
    base === ''
      ? 'Start dating-api on port 3001 (or set API_PROXY_TARGET in next.config env). Requests use same-origin /api via Next rewrites.'
      : 'Start dating-api, confirm NEXT_PUBLIC_API_URL, and if the UI uses another hostname than the API, add that origin to dating-api CORS_ORIGIN.';
  return `Network error calling ${base || '(same-origin)'}${path}. ${hint}`;
}

export function conversationsApiUnreachableMessage(
  base: string,
  path: string,
): string {
  return `Cannot reach API at ${base || 'same origin'}${path}. Is dating-api running?`;
}
