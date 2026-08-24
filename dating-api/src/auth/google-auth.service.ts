import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { GoogleIdentity } from '../users/google-identity.types';

function trimOrNull(s: string | undefined | null): string | null {
  const t = s?.trim();
  return t === '' || t == null ? null : t;
}

/**
 * Google-only: verifies OIDC `id_token` JWTs server-side (signature + audience).
 * All Google-specific parsing stays here; callers receive {@link GoogleIdentity} only.
 */
@Injectable()
export class GoogleAuthService {
  constructor(private readonly cfg: AuthSessionConfigService) {}

  /**
   * Verifies a Google-issued `id_token` against configured client IDs (audience) and
   * returns a normalized {@link GoogleIdentity}.
   *
   * @throws UnauthorizedException invalid/missing token, unverified email, or malformed claims
   * @throws InternalServerErrorException no Google client IDs configured
   */
  async verifyIdToken(
    idToken: string | undefined | null,
  ): Promise<GoogleIdentity> {
    const raw = idToken?.trim();
    if (!raw) {
      throw new UnauthorizedException('Missing id_token');
    }

    const audiences = this.cfg.googleClientIds;
    if (audiences.length === 0) {
      throw new InternalServerErrorException(
        'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_IDS is not configured; cannot verify Google id tokens.',
      );
    }

    const client = new OAuth2Client();
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: raw,
        audience: audiences,
      });
    } catch {
      throw new UnauthorizedException('Invalid Google id_token');
    }

    const payload = ticket.getPayload();
    if (!payload) {
      throw new UnauthorizedException('Invalid Google id_token payload');
    }

    const googleId = payload.sub?.trim();
    const emailRaw = payload.email?.trim();
    if (!googleId || !emailRaw) {
      throw new UnauthorizedException('Invalid Google id_token payload');
    }
    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const email = emailRaw.toLowerCase();

    return {
      googleId,
      email,
      displayName: trimOrNull(payload.name),
      avatarUrl: trimOrNull(payload.picture),
    };
  }
}
