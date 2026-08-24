import { isMobile } from "@/lib/platform/platform";

/**
 * dating-api base URL (no trailing slash).
 *
 * - If `NEXT_PUBLIC_API_URL` is set → use it (explicit cross-origin).
 * - In the **browser** when unset → `''` so requests go to same-origin `/api/...`
 *   (proxied by `next.config.ts` to dating-api; fixes cookies with `SameSite=Lax`).
 * - On **mobile** (Capacitor / React Native) when unset → throw (no static host rewrite).
 * - On the **server** (RSC, tests) when unset → `INTERNAL_API_URL` or `http://127.0.0.1:3001`.
 */
export class MobileApiUrlMissingError extends Error {
  constructor() {
    super(
      "NEXT_PUBLIC_API_URL is required for Capacitor and React Native builds. " +
        "Set it before npm run build:capacitor (e.g. http://10.0.2.2:3001 for Android emulator, or your LAN IP for a device).",
    );
    this.name = "MobileApiUrlMissingError";
  }
}

function readExplicitPublicApiUrl(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
  return raw || undefined;
}

/**
 * Browser/mobile API origin. Web + unset → ''.
 * Mobile + unset → throw. SSR → INTERNAL_API_URL / default.
 */
export function resolvePublicApiOrigin(): string {
  const explicit = readExplicitPublicApiUrl();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== "undefined") {
    if (isMobile()) {
      throw new MobileApiUrlMissingError();
    }
    return "";
  }

  return (
    process.env.INTERNAL_API_URL?.trim().replace(/\/$/, "") ??
    "http://127.0.0.1:3001"
  );
}

/** Same-origin `/api/...` in the browser when `NEXT_PUBLIC_API_URL` is unset. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBase();
  return base ? `${base}${p}` : p;
}

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    return resolvePublicApiOrigin();
  }
  const explicit = readExplicitPublicApiUrl();
  if (explicit) {
    return explicit;
  }
  return (
    process.env.INTERNAL_API_URL?.trim().replace(/\/$/, "") ??
    "http://127.0.0.1:3001"
  );
}
