import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { AuthEndpointRateLimitService } from './auth-endpoint-rate-limit.service';
import { AuthLoginRateLimitGuard } from './auth-login-rate-limit.guard';
import { AuthRefreshRateLimitGuard } from './auth-refresh-rate-limit.guard';

describe('Auth rate limit guards', () => {
  const rateLimit = {
    assertLoginAllowed: jest.fn(),
    assertRefreshAllowed: jest.fn(),
  };

  function mockContext(req: {
    headers?: Record<string, string | string[]>;
    socket?: { remoteAddress?: string };
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: req.headers ?? {},
          socket: req.socket ?? { remoteAddress: '127.0.0.1' },
        }),
      }),
    } as ExecutionContext;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    rateLimit.assertLoginAllowed.mockResolvedValue(undefined);
    rateLimit.assertRefreshAllowed.mockResolvedValue(undefined);
  });

  it('AuthLoginRateLimitGuard delegates to assertLoginAllowed with resolved IP', async () => {
    const guard = new AuthLoginRateLimitGuard(
      rateLimit as unknown as AuthEndpointRateLimitService,
    );
    const ctx = mockContext({
      headers: { 'x-forwarded-for': '198.51.100.1' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(rateLimit.assertLoginAllowed).toHaveBeenCalledWith('198.51.100.1');
  });

  it('AuthLoginRateLimitGuard propagates 429 from service', async () => {
    rateLimit.assertLoginAllowed.mockRejectedValue(
      new HttpException(
        { message: 'Too many login attempts. Please wait.' },
        HttpStatus.TOO_MANY_REQUESTS,
      ),
    );
    const guard = new AuthLoginRateLimitGuard(
      rateLimit as unknown as AuthEndpointRateLimitService,
    );

    await expect(
      guard.canActivate(mockContext({ headers: {} })),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('AuthRefreshRateLimitGuard delegates to assertRefreshAllowed with resolved IP', async () => {
    const guard = new AuthRefreshRateLimitGuard(
      rateLimit as unknown as AuthEndpointRateLimitService,
    );
    const ctx = mockContext({
      headers: { 'x-forwarded-for': '203.0.113.5' },
    });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(rateLimit.assertRefreshAllowed).toHaveBeenCalledWith('203.0.113.5');
  });
});
