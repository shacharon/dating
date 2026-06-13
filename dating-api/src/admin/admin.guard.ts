import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth-request.types';
import { AdminConfigService } from './admin-config.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminConfig: AdminConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = req.authUser?.id;
    if (!userId || !this.adminConfig.isAdmin(userId)) {
      throw new ForbiddenException({ error: 'admin_forbidden' });
    }
    return true;
  }
}
