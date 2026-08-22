import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { JwtAuthConfigService } from '../config/jwt-auth-config.service';
import { RefreshTokenRepository } from './refresh-token.repository';

export interface AccessTokenClaims {
  sub: string;
  typ: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  typ: 'refresh';
  jti: string;
}

type VerifiedJwtPayload = {
  sub?: string;
  typ?: string;
  jti?: string;
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly jwtCfg: JwtAuthConfigService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {}

  async generateTokenPair(
    userId: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    this.assertSigningConfigured();
    const secret = this.jwtCfg.requireJwtSecret();
    const signOpts = (expiresIn: string): JwtSignOptions => ({
      secret,
      expiresIn: expiresIn as JwtSignOptions['expiresIn'],
    });

    const accessToken = this.jwt.sign(
      { sub: userId, typ: 'access' } satisfies AccessTokenClaims,
      signOpts(this.jwtCfg.accessTtl),
    );

    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: userId, typ: 'refresh', jti } satisfies RefreshTokenClaims,
      signOpts(this.jwtCfg.refreshTtl),
    );

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + this.jwtCfg.refreshTtlDays);
    await this.refreshTokens.store(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<{ userId: string } | null> {
    const payload = await this.verifyToken(token);
    if (!payload || payload.typ !== 'access' || !payload.sub?.trim()) {
      return null;
    }
    return { userId: payload.sub.trim() };
  }

  async verifyRefreshToken(
    token: string,
  ): Promise<{ userId: string; jti: string } | null> {
    const payload = await this.verifyToken(token);
    if (
      !payload ||
      payload.typ !== 'refresh' ||
      !payload.sub?.trim() ||
      typeof payload.jti !== 'string' ||
      !payload.jti.trim()
    ) {
      return null;
    }
    return { userId: payload.sub.trim(), jti: payload.jti.trim() };
  }

  async rotateRefreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const claims = await this.verifyRefreshToken(refreshToken);
    if (!claims) {
      throw new UnauthorizedException();
    }
    const active = await this.refreshTokens.isActive(refreshToken);
    if (!active) {
      throw new UnauthorizedException();
    }
    await this.refreshTokens.revoke(refreshToken);
    return this.generateTokenPair(claims.userId);
  }

  async revokeRefreshToken(rawRefreshToken: string): Promise<void> {
    await this.refreshTokens.revoke(rawRefreshToken);
  }

  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }

  /** Fail fast before session/cookie side effects when JWT signing is misconfigured. */
  assertSigningConfigured(): void {
    this.jwtCfg.requireJwtSecret();
  }

  private async verifyToken(token: string): Promise<VerifiedJwtPayload | null> {
    const secret = this.jwtCfg.jwtSecret;
    if (!secret || !token?.trim()) {
      return null;
    }
    try {
      return await this.jwt.verifyAsync<VerifiedJwtPayload>(token.trim(), {
        secret,
      });
    } catch {
      return null;
    }
  }
}
