/**
 * dating-api base URL (no trailing slash).
 *
 * - If `NEXT_PUBLIC_API_URL` is set → use it (explicit cross-origin).
 * - In the **browser** when unset → `''` so requests go to same-origin `/api/...`
 *   (proxied by `next.config.ts` to dating-api; fixes cookies with `SameSite=Lax`).
 * - On the **server** (RSC, tests) when unset → `INTERNAL_API_URL` or `http://127.0.0.1:3001`.
 */
/** Same-origin `/api/...` in the browser when `NEXT_PUBLIC_API_URL` is unset. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${p}` : p;
}

export function getApiBase(): string {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  if (explicit) {
    return explicit;
  }
  if (typeof window !== "undefined") {
    return "";
  }
  return (
    process.env.INTERNAL_API_URL?.trim().replace(/\/$/, "") ??
    "http://127.0.0.1:3001"
  );
}
