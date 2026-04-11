import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import { USER_STATUS_ACTIVE } from './auth.constants';
import { AUTH_ERROR_CODES } from './auth-error-codes';
import type { AuthenticatedRequest } from './auth-request.types';
import { readSessionCookieRaw } from './auth-request.util';
import { toAuthMeResponseDto } from './auth.dto';

/**
 * Session-only auth: requires valid HttpOnly session cookie, ACTIVE user.
 * Attaches {@link AuthenticatedRequest.authUser} and {@link AuthenticatedRequest.authSession}.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly users: UsersService,
    private readonly cfg: AuthSessionConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const raw = readSessionCookieRaw(req, this.cfg.sessionCookieName);

    const validated = await this.sessions.validateSessionToken(raw);
    if (!validated) {
      throw new UnauthorizedException();
    }

    const user = await this.users.findById(validated.userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    if (user.status !== USER_STATUS_ACTIVE) {
      throw new ForbiddenException({
        statusCode: 403,
        auth_error: AUTH_ERROR_CODES.disabled_user,
      });
    }

    req.authUser = toAuthMeResponseDto(user);
    req.authSession = validated;
    return true;
  }
}
