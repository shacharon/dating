import type { Request, Response } from 'express';
import { UserStatus } from '@prisma/client';
import { ProductAnalyticsEvents } from '../analytics/product-analytics.events';
import { AuthService } from './auth.service';
import type { AuthSessionConfigService } from '../config/auth-session-config.service';
import type { MessagingSocketRegistry } from '../messaging-realtime/messaging-socket-registry.service';
import type { SessionService } from '../session/session.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { GoogleAuthService } from './google-auth.service';
import type { UsersService } from '../users/users.service';
import type { ReferralAttributionService } from './referral-attribution.service';
import type { AnalyticsService } from '../analytics/analytics.service';

describe('AuthService.logout', () => {
  it('disconnects messaging sockets for the session before revoke', async () => {
    const sessions = {
      validateSessionToken: jest.fn().mockResolvedValue({
        userId: 'user_1',
        sessionId: 'sess_1',
      }),
      revokeSession: jest.fn().mockResolvedValue(true),
    } as unknown as SessionService;

    const socketRegistry = {
      disconnectBySessionId: jest.fn().mockResolvedValue(undefined),
    } as unknown as MessagingSocketRegistry;

    const tokens = {
      generateTokenPair: jest
        .fn()
        .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
      revokeRefreshToken: jest.fn(),
      revokeAllRefreshTokens: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as unknown as import('./token.service').TokenService;

    const service = new AuthService(
      {
        sessionCookieName: 'dating_session',
        cookieSecure: false,
        cookieDomain: undefined,
      } as AuthSessionConfigService,
      {} as UsersService,
      sessions,
      {} as GoogleAuthService,
      { trace: jest.fn() } as unknown as StructuredObservabilityService,
      socketRegistry,
      { resolveReferrerUserId: jest.fn() } as unknown as import('./referral-attribution.service').ReferralAttributionService,
      { track: jest.fn() } as unknown as import('../analytics/analytics.service').AnalyticsService,
      tokens,
    );

    const req = {
      headers: { cookie: 'dating_session=raw-token' },
    } as Request;
    const res = { clearCookie: jest.fn() } as unknown as Response;

    await service.logout(req, res);

    expect(socketRegistry.disconnectBySessionId).toHaveBeenCalledWith(
      'sess_1',
    );
    expect(sessions.revokeSession).toHaveBeenCalled();
  });
});

describe('AuthService referral signup', () => {
  it('tracks referral.signup_completed with empty properties on attributed new user', async () => {
    const identity = {
      googleId: 'gid-new-ref',
      email: 'newref@example.com',
      displayName: 'New Ref',
      avatarUrl: null as string | null,
    };
    const createdUser = {
      id: 'user_new_ref',
      email: identity.email,
      googleId: identity.googleId,
      displayName: identity.displayName,
      avatarUrl: null,
      status: UserStatus.ACTIVE,
      emailNotificationsEnabled: true,
      inAppNotificationsEnabled: true,
    };

    const users = {
      findByGoogleId: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      createFromGoogleIdentity: jest.fn().mockResolvedValue(createdUser),
    } as unknown as UsersService;

    const referralAttribution = {
      resolveReferrerUserId: jest.fn().mockResolvedValue('user_referrer'),
    } as unknown as ReferralAttributionService;

    const analytics = { track: jest.fn() } as unknown as AnalyticsService;

    const sessions = {
      createSession: jest.fn().mockResolvedValue({
        sessionId: 'sess_ref',
        rawToken: 'raw-ref',
      }),
    } as unknown as SessionService;

    const tokens = {
      generateTokenPair: jest
        .fn()
        .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
      revokeRefreshToken: jest.fn(),
      revokeAllRefreshTokens: jest.fn(),
      verifyAccessToken: jest.fn(),
    } as unknown as import('./token.service').TokenService;

    const service = new AuthService(
      {
        sessionCookieName: 'dating_session',
        sessionTtlDays: 14,
        cookieSecure: false,
        cookieDomain: undefined,
      } as AuthSessionConfigService,
      users,
      sessions,
      {
        verifyIdToken: jest.fn().mockResolvedValue(identity),
      } as unknown as GoogleAuthService,
      { trace: jest.fn() } as unknown as StructuredObservabilityService,
      { disconnectBySessionId: jest.fn() } as unknown as MessagingSocketRegistry,
      referralAttribution,
      analytics,
      tokens,
    );

    const req = { headers: {}, socket: { remoteAddress: '127.0.0.1' } } as Request;
    const res = { cookie: jest.fn() } as unknown as Response;

    await service.loginWithGoogleIdToken(req, res, {
      idToken: 'jwt-ref',
      referredByUserId: 'user_referrer',
    });

    expect(users.createFromGoogleIdentity).toHaveBeenCalledWith(identity, {
      referredByUserId: 'user_referrer',
    });
    expect(analytics.track).toHaveBeenCalledWith(
      'user_new_ref',
      ProductAnalyticsEvents.REFERRAL_SIGNUP_COMPLETED,
      {},
    );
    expect(
      (analytics.track as jest.Mock).mock.calls.find(
        (call) => call[1] === ProductAnalyticsEvents.REFERRAL_SIGNUP_COMPLETED,
      )?.[2],
    ).not.toHaveProperty('referredByUserId');
  });
});
