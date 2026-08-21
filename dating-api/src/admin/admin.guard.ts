import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.types';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import { AdminConfigService } from './admin-config.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly adminConfig: AdminConfigService,
    private readonly obs: StructuredObservabilityService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.authUser?.id;
    if (!userId || !this.adminConfig.isAdmin(userId)) {
      this.obs.error('admin guard: forbidden', ErrorCodes.ADMIN_FORBIDDEN);
      throw new ForbiddenException({ error: 'admin_forbidden' });
    }
    return true;
  }
}
