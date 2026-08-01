import { Module } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminGuard } from './admin.guard';

/**
 * Lightweight admin allowlist + guard without AdminModule's MeProfile/photos graph.
 * Use for locking legacy internal HTTP surfaces (Sprint 28 Story 2).
 */
@Module({
  providers: [AdminConfigService, AdminGuard],
  exports: [AdminConfigService, AdminGuard],
})
export class AdminAuthModule {}
