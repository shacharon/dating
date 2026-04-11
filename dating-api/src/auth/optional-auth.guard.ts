import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import { UsersService } from '../users/users.service';
import type { AuthenticatedRequest } from './auth-request.types';
import { readSessionCookieRaw } from './auth-request.util';
import { toAuthMeResponseDto } from './auth.dto';

/**
 * Populates {@link AuthenticatedRequest.authUser} / `authSession` when the session cookie
 * resolves to an ACTIVE user; otherwise leaves them unset and allows the request through.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(
    private readonly sessions: SessionService,
    private readonly users: UsersService,
    private readonly cfg: AuthSessionConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    delete req.authUser;
    delete req.authSession;

    const raw = readSessionCookieRaw(req, this.cfg.sessionCookieName);
    const validated = await this.sessions.validateSessionToken(raw);
    if (!validated) {
      return true;
    }

    const user = await this.users.findById(validated.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      return true;
    }

    req.authUser = toAuthMeResponseDto(user);
    req.authSession = validated;
    return true;
  }
}
