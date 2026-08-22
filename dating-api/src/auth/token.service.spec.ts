import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtAuthConfigService } from '../config/jwt-auth-config.service';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TokenService } from './token.service';

describe('TokenService', () => {
  const JWT_SECRET = 'unit-test-jwt-secret-min-32-chars';
  let jwt: jest.Mocked<Pick<JwtService, 'sign' | 'verifyAsync'>>;
  let jwtCfg: jest.Mocked<
    Pick<
      JwtAuthConfigService,
      'requireJwtSecret' | 'jwtSecret' | 'accessTtl' | 'refreshTtl' | 'refreshTtlDays'
    >
  >;
  let refreshTokens: jest.Mocked<
    Pick<
      RefreshTokenRepository,
      'store' | 'isActive' | 'revoke' | 'revokeAllForUser'
    >
  >;
  let service: TokenService;

  beforeEach(() => {
    jwt = {
      sign: jest.fn((payload, opts) => `signed-${payload.typ}-${opts?.expiresIn}`),
      verifyAsync: jest.fn(),
    };
    jwtCfg = {
      jwtSecret: JWT_SECRET,
      accessTtl: '15m',
      refreshTtl: '7d',
      refreshTtlDays: 7,
      requireJwtSecret: jest.fn(() => JWT_SECRET),
    };
    refreshTokens = {
      store: jest.fn().mockResolvedValue(undefined),
      isActive: jest.fn(),
      revoke: jest.fn().mockResolvedValue(undefined),
      revokeAllForUser: jest.fn().mockResolvedValue(undefined),
    };
    service = new TokenService(
      jwt as unknown as JwtService,
      jwtCfg as unknown as JwtAuthConfigService,
      refreshTokens as unknown as RefreshTokenRepository,
    );
  });

  it('generateTokenPair stores hashed refresh row and returns both tokens', async () => {
    const pair = await service.generateTokenPair('user_1');

    expect(pair.accessToken).toContain('signed-access');
    expect(pair.refreshToken).toContain('signed-refresh');
    expect(refreshTokens.store).toHaveBeenCalledWith(
      'user_1',
      pair.refreshToken,
      expect.any(Date),
    );
  });

  it('verifyAccessToken rejects refresh typ', async () => {
    jwt.verifyAsync.mockResolvedValue({ sub: 'user_1', typ: 'refresh' });
    await expect(service.verifyAccessToken('tok')).resolves.toBeNull();
  });

  it('rotateRefreshToken revokes old token before issuing new pair', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      typ: 'refresh',
      jti: 'jti-1',
    });
    refreshTokens.isActive.mockResolvedValue(true);

    await service.rotateRefreshToken('refresh-raw');

    expect(refreshTokens.revoke).toHaveBeenCalledWith('refresh-raw');
    expect(refreshTokens.store).toHaveBeenCalled();
  });

  it('rotateRefreshToken throws when refresh row is inactive', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      typ: 'refresh',
      jti: 'jti-1',
    });
    refreshTokens.isActive.mockResolvedValue(false);

    await expect(service.rotateRefreshToken('refresh-raw')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('assertSigningConfigured delegates to jwt config', () => {
    service.assertSigningConfigured();
    expect(jwtCfg.requireJwtSecret).toHaveBeenCalled();
  });
});
