import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { mergeRequestLogContext } from '../logging/request-log-context';
import type { AuthenticatedRequest } from './auth-request.types';
import { AuthCredentialsService } from './auth-credentials.service';

/**
 * Populates {@link AuthenticatedRequest.authUser} when Bearer JWT or session cookie
 * resolves to an ACTIVE user; otherwise leaves auth fields unset and allows the request.
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  constructor(private readonly credentials: AuthCredentialsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    delete req.authUser;
    delete req.authSession;
    delete req.authMethod;

    const resolved = await this.credentials.resolveOptional(req);
    if (!resolved) {
      return true;
    }

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
