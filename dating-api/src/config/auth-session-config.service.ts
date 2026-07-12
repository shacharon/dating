import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_SESSION_COOKIE_NAME = 'dating_session';
const DEFAULT_SESSION_TTL_DAYS = 14;
const DEFAULT_CORS_ORIGIN = 'http://localhost:3000,http://127.0.0.1:3000';

function parseEnvBool(raw: string | undefined): boolean {
  if (raw == null || raw.trim() === '') {
    return false;
  }
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function trimOrUndefined(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t === '' || t == null ? undefined : t;
}

@Injectable()
export class AuthSessionConfigService {
  constructor(private readonly config: ConfigService) {}

  /** Google OAuth client ID (public); required once Google auth is enabled. */
  get googleClientId(): string | undefined {
    return trimOrUndefined(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  /** HttpOnly session cookie name. */
  get sessionCookieName(): string {
    return (
      trimOrUndefined(this.config.get<string>('SESSION_COOKIE_NAME')) ??
      DEFAULT_SESSION_COOKIE_NAME
    );
  }

  /**
   * Server-side pepper for session token hashing (never send to clients).
   * Required once session persistence is enabled.
   */
  get sessionSecretPepper(): string | undefined {
    return trimOrUndefined(this.config.get<string>('SESSION_SECRET_PEPPER'));
  }

  /** Sliding/max session lifetime in days (positive integer). */
  get sessionTtlDays(): number {
    const raw = this.config.get<string>('SESSION_TTL_DAYS');
    const n = Number.parseInt(String(raw ?? '').trim(), 10);
    if (!Number.isFinite(n) || n < 1) {
      return DEFAULT_SESSION_TTL_DAYS;
    }
    return n;
  }

  /**
   * Cookie `Domain` attribute; omit in dev (host-only). Use leading dot only if your deployment needs it.
   */
  get cookieDomain(): string | undefined {
    return trimOrUndefined(this.config.get<string>('COOKIE_DOMAIN'));
  }

  /** Cookie `Secure` flag (HTTPS-only). */
  get cookieSecure(): boolean {
    return parseEnvBool(this.config.get<string>('COOKIE_SECURE'));
  }

  /**
   * Comma-separated allowed browser origins for CORS (exact match after trim).
   * Bootstrap splits this list; local regex fallback stays in `main.ts`.
   */
  get corsOrigin(): string {
    return (
      trimOrUndefined(this.config.get<string>('CORS_ORIGIN')) ??
      DEFAULT_CORS_ORIGIN
    );
  }
}
