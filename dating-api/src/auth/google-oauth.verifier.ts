import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { GoogleIdentity } from '../users/google-identity.types';
import { GoogleAuthService } from './google-auth.service';

@Injectable()
export class GoogleOAuthVerifier {
  constructor(
    private readonly cfg: AuthSessionConfigService,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  /**
   * Exchanges a one-time authorization `code` for tokens, then verifies the returned
   * `id_token` via {@link GoogleAuthService.verifyIdToken} (audience = `GOOGLE_CLIENT_ID`).
   */
  async verifyAuthorizationCode(code: string): Promise<GoogleIdentity> {
    const clientId = this.cfg.googleClientId;
    const clientSecret = this.cfg.googleClientSecret;
    const redirectUri = this.cfg.googleRedirectUri;
    if (!clientId || !clientSecret || !redirectUri) {
      throw new InternalServerErrorException(
        'Google OAuth is not fully configured (client id, secret, redirect URI).',
      );
    }

    const client = new OAuth2Client(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    const idToken = tokens.id_token;
    if (!idToken) {
      throw new UnauthorizedException('Google did not return an id_token');
    }

    return this.googleAuth.verifyIdToken(idToken);
  }
}
