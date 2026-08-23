import { HttpException, HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { REDIS_CLIENT } from '../cache/cache.ports';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { AuthEndpointRateLimitService } from './auth-endpoint-rate-limit.service';
import { AuthLoginRateLimitStoreProvider } from './auth-login-rate-limit-store.provider';
import { AuthRefreshRateLimitStoreProvider } from './auth-refresh-rate-limit-store.provider';
import {
  AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW,
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS,
  AUTH_REFRESH_RATE_LIMIT_MAX_PER_WINDOW,
  AUTH_REFRESH_RATE_LIMIT_WINDOW_MS,
} from './auth-rate-limit.constants';

describe('AuthEndpointRateLimitService (memory)', () => {
  let service: AuthEndpointRateLimitService;
  const obs = { trace: jest.fn(), error: jest.fn() };

  beforeEach(async () => {
    delete process.env.REDIS_URL;
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: REDIS_CLIENT,
          useValue: {
            getClient: () => null,
            isAvailable: () => false,
            isUrlConfigured: () => false,
          },
        },
        AuthLoginRateLimitStoreProvider,
        AuthRefreshRateLimitStoreProvider,
        AuthEndpointRateLimitService,
        {
          provide: SimpleLogger,
          useValue: { warn: jest.fn(), log: jest.fn(), error: jest.fn() },
        },
        {
          provide: StructuredObservabilityService,
          useValue: obs,
        },
      ],
    }).compile();

    const loginStore = module.get(AuthLoginRateLimitStoreProvider);
    const refreshStore = module.get(AuthRefreshRateLimitStoreProvider);
    await loginStore.onModuleInit();
    await refreshStore.onModuleInit();
    service = module.get(AuthEndpointRateLimitService);
    await service.resetForTests();
  });

  it('uses in-memory stores when REDIS_URL is unset', () => {
    expect(service.isUsingRedisStore()).toEqual({ login: false, refresh: false });
  });

  it('allows login attempts up to the window limit', async () => {
    for (let i = 0; i < AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await expect(service.assertLoginAllowed('1.2.3.4')).resolves.toBeUndefined();
    }
  });

  it('throws HttpException 429 on 11th login within the same window', async () => {
    for (let i = 0; i < AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.assertLoginAllowed('1.2.3.4');
    }

    await expect(service.assertLoginAllowed('1.2.3.4')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      'auth login rate limited clientIp=1.2.3.4',
      ErrorCodes.AUTH_LOGIN_RATE_LIMITED,
    );
    try {
      await service.assertLoginAllowed('1.2.3.4');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect((e as HttpException).getResponse()).toEqual({
        message: 'Too many login attempts. Please wait.',
      });
    }
  });

  it('throws HttpException 429 on 6th refresh within the same window', async () => {
    for (let i = 0; i < AUTH_REFRESH_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.assertRefreshAllowed('5.6.7.8');
    }

    await expect(service.assertRefreshAllowed('5.6.7.8')).rejects.toBeInstanceOf(
      HttpException,
    );
    expect(obs.trace).toHaveBeenCalledWith(
      'auth refresh rate limited clientIp=5.6.7.8',
      ErrorCodes.AUTH_REFRESH_RATE_LIMITED,
    );
    try {
      await service.assertRefreshAllowed('5.6.7.8');
    } catch (e) {
      expect((e as HttpException).getResponse()).toEqual({
        message: 'Too many refresh attempts. Please wait.',
      });
    }
  });

  it('allows login again after the rate-limit window expires', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.assertLoginAllowed('9.9.9.9');
    }
    await expect(service.assertLoginAllowed('9.9.9.9')).rejects.toBeInstanceOf(
      HttpException,
    );

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + AUTH_LOGIN_RATE_LIMIT_WINDOW_MS + 1);

    await expect(service.assertLoginAllowed('9.9.9.9')).resolves.toBeUndefined();

    jest.restoreAllMocks();
  });

  it('resetForTests clears rate-limit state', async () => {
    for (let i = 0; i < AUTH_LOGIN_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      await service.assertLoginAllowed('1.1.1.1');
    }
    await expect(service.assertLoginAllowed('1.1.1.1')).rejects.toBeInstanceOf(
      HttpException,
    );

    await service.resetForTests();
    await expect(service.assertLoginAllowed('1.1.1.1')).resolves.toBeUndefined();
  });
});
