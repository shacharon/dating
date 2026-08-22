import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthSessionConfigService } from '../config/auth-session-config.service';
import { SessionService } from '../session/session.service';
import type { ValidatedSession } from '../session/session.types';
import { UsersService } from '../users/users.service';
import { USER_STATUS_ACTIVE } from './auth.constants';
import { toAuthMeResponseDto, type AuthMeResponseDto } from './auth.dto';
import { readBearerToken, readSessionCookieRaw } from './auth-request.util';
import { TokenService } from './token.service';

export type ResolvedAuth =
  | { kind: 'session'; user: AuthMeResponseDto; session: ValidatedSession }
  | { kind: 'bearer'; user: AuthMeResponseDto };

export type AuthGuardResolveResult =
  | { status: 'ok'; auth: ResolvedAuth }
  | { status: 'disabled' }
  | { status: 'unauthorized' };

@Injectable()
export class AuthCredentialsService {
  constructor(
    private readonly tokens: TokenService,
    private readonly sessions: SessionService,
    private readonly users: UsersService,
    private readonly cfg: AuthSessionConfigService,
  ) {}

  async resolveForGuard(req: Request): Promise<AuthGuardResolveResult> {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
      const bearer = readBearerToken(req);
      if (!bearer) {
        return { status: 'unauthorized' };
      }
      return this.resolveBearerForGuard(bearer);
    }
    return this.resolveSessionForGuard(req);
  }

  async resolveOptional(req: Request): Promise<ResolvedAuth | null> {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && /^Bearer\s+/i.test(authHeader)) {
      const bearer = readBearerToken(req);
      if (!bearer) {
        return null;
      }
      return this.resolveBearerOptional(bearer);
    }
    return this.resolveSessionOptional(req);
  }

  private async resolveBearerForGuard(
    bearer: string,
  ): Promise<AuthGuardResolveResult> {
    const verified = await this.tokens.verifyAccessToken(bearer);
    if (!verified) {
      return { status: 'unauthorized' };
    }
    return this.userIdToGuardResult(verified.userId, null);
  }

  private async resolveBearerOptional(
    bearer: string,
  ): Promise<ResolvedAuth | null> {
    const verified = await this.tokens.verifyAccessToken(bearer);
    if (!verified) {
      return null;
    }
    const loaded = await this.loadActiveUser(verified.userId);
    if (!loaded) {
      return null;
    }
    return { kind: 'bearer', user: loaded };
  }

  private async resolveSessionForGuard(
    req: Request,
  ): Promise<AuthGuardResolveResult> {
    const raw = readSessionCookieRaw(req, this.cfg.sessionCookieName);
    const validated = await this.sessions.validateSessionToken(raw);
    if (!validated) {
      return { status: 'unauthorized' };
    }
    return this.userIdToGuardResult(validated.userId, validated);
  }

  private async resolveSessionOptional(
    req: Request,
  ): Promise<ResolvedAuth | null> {
    const raw = readSessionCookieRaw(req, this.cfg.sessionCookieName);
    const validated = await this.sessions.validateSessionToken(raw);
    if (!validated) {
      return null;
    }
    const loaded = await this.loadActiveUser(validated.userId);
    if (!loaded) {
      return null;
    }
    return { kind: 'session', user: loaded, session: validated };
  }

  private async userIdToGuardResult(
    userId: string,
    session: ValidatedSession | null,
  ): Promise<AuthGuardResolveResult> {
    const user = await this.users.findById(userId);
    if (!user || user.deletedAt != null) {
      return { status: 'unauthorized' };
    }
    if (user.status !== USER_STATUS_ACTIVE) {
      return { status: 'disabled' };
    }
    const dto = toAuthMeResponseDto(user);
    if (session) {
      return {
        status: 'ok',
        auth: { kind: 'session', user: dto, session },
      };
    }
    return { status: 'ok', auth: { kind: 'bearer', user: dto } };
  }

  private async loadActiveUser(userId: string): Promise<AuthMeResponseDto | null> {
    const user = await this.users.findById(userId);
    if (!user || user.deletedAt != null || user.status !== USER_STATUS_ACTIVE) {
      return null;
    }
    return toAuthMeResponseDto(user);
  }
}
