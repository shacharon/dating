import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AuthEndpointRateLimitService } from './auth-endpoint-rate-limit.service';
import { resolveClientIp } from './request-client-ip.util';

@Injectable()
export class AuthRefreshRateLimitGuard implements CanActivate {
  constructor(private readonly rateLimit: AuthEndpointRateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    await this.rateLimit.assertRefreshAllowed(resolveClientIp(req));
    return true;
  }
}
