import {
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { AuthLoginRateLimitExceededError } from './auth-login-rate-limit.error';
import { AuthLoginRateLimitStoreProvider } from './auth-login-rate-limit-store.provider';
import { AuthRefreshRateLimitExceededError } from './auth-refresh-rate-limit.error';
import { AuthRefreshRateLimitStoreProvider } from './auth-refresh-rate-limit-store.provider';

@Injectable()
export class AuthEndpointRateLimitService {
  constructor(
    private readonly loginStore: AuthLoginRateLimitStoreProvider,
    private readonly refreshStore: AuthRefreshRateLimitStoreProvider,
    private readonly obs: StructuredObservabilityService,
  ) {}

  isUsingRedisStore(): { login: boolean; refresh: boolean } {
    return {
      login: this.loginStore.isUsingRedisStore(),
      refresh: this.refreshStore.isUsingRedisStore(),
    };
  }

  async assertLoginAllowed(clientIp: string): Promise<void> {
    try {
      await this.loginStore.consume(clientIp);
    } catch (e) {
      if (e instanceof AuthLoginRateLimitExceededError) {
        this.obs.trace(
          `auth login rate limited clientIp=${clientIp}`,
          ErrorCodes.AUTH_LOGIN_RATE_LIMITED,
        );
        throw new HttpException(
          { message: 'Too many login attempts. Please wait.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw e;
    }
  }

  async assertRefreshAllowed(clientIp: string): Promise<void> {
    try {
      await this.refreshStore.consume(clientIp);
    } catch (e) {
      if (e instanceof AuthRefreshRateLimitExceededError) {
        this.obs.trace(
          `auth refresh rate limited clientIp=${clientIp}`,
          ErrorCodes.AUTH_REFRESH_RATE_LIMITED,
        );
        throw new HttpException(
          { message: 'Too many refresh attempts. Please wait.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw e;
    }
  }

  /** Test-only: clear all buckets / Redis keys for rate limit state. */
  async resetForTests(): Promise<void> {
    await this.loginStore.resetForTests();
    await this.refreshStore.resetForTests();
  }
}
