import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DEFAULT_ACCESS_TTL = '15m';
const DEFAULT_REFRESH_TTL = '7d';
const DEFAULT_REFRESH_TTL_DAYS = 7;

function trimOrUndefined(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t === '' || t == null ? undefined : t;
}

/** Parses `7d`-style refresh TTL into whole days for DB `expiresAt`. */
function parseRefreshTtlDays(raw: string): number {
  const m = /^(\d+)\s*d$/i.exec(raw.trim());
  if (m) {
    const n = Number.parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1) {
      return n;
    }
  }
  return DEFAULT_REFRESH_TTL_DAYS;
}

@Injectable()
export class JwtAuthConfigService {
  constructor(private readonly config: ConfigService) {}

  get jwtSecret(): string | undefined {
    return trimOrUndefined(this.config.get<string>('JWT_SECRET'));
  }

  get accessTtl(): string {
    return (
      trimOrUndefined(this.config.get<string>('JWT_ACCESS_TTL')) ??
      DEFAULT_ACCESS_TTL
    );
  }

  get refreshTtl(): string {
    return (
      trimOrUndefined(this.config.get<string>('JWT_REFRESH_TTL')) ??
      DEFAULT_REFRESH_TTL
    );
  }

  get refreshTtlDays(): number {
    return parseRefreshTtlDays(this.refreshTtl);
  }

  requireJwtSecret(): string {
    const secret = this.jwtSecret;
    if (!secret) {
      throw new Error('JWT_SECRET is required to sign access and refresh tokens');
    }
    return secret;
  }
}
