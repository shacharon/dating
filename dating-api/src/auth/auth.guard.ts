import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { mergeRequestLogContext } from '../logging/request-log-context';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { AUTH_ERROR_CODES } from './auth-error-codes';
import type { AuthenticatedRequest } from './auth-request.types';
import { AuthCredentialsService } from './auth-credentials.service';

/**
 * Dual-mode auth: Bearer JWT (mobile) or HttpOnly session cookie (web).
 * Attaches {@link AuthenticatedRequest.authUser} and optional {@link AuthenticatedRequest.authSession}.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly credentials: AuthCredentialsService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    delete req.authUser;
    delete req.authSession;
    delete req.authMethod;

    const result = await this.credentials.resolveForGuard(req);
    if (result.status === 'disabled') {
      throw new ForbiddenException({
        statusCode: 403,
        auth_error: AUTH_ERROR_CODES.disabled_user,
      });
    }
    if (result.status === 'unauthorized') {
      this.obs.error(
        'auth guard: missing or invalid credentials',
        ErrorCodes.AUTH_GUARD_UNAUTHORIZED,
      );
      throw new UnauthorizedException();
    }

    const resolved = result.auth;
    req.authUser = resolved.user;
    req.authMethod = resolved.kind === 'session' ? 'session' : 'bearer';
    if (resolved.kind === 'session') {
      mergeRequestLogContext({
        userId: resolved.session.userId,
        sessionId: resolved.session.sessionId,
      });
      req.authSession = resolved.session;
    } else {
      mergeRequestLogContext({ userId: resolved.user.id });
    }
    return true;
  }
}
