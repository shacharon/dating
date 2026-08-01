import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { EvaluateController } from './evaluate.controller';
import { EvaluateServiceModule } from './evaluate-service.module';

@Module({
  imports: [EvaluateServiceModule, AuthModule, AdminAuthModule],
  controllers: [EvaluateController],
  exports: [EvaluateServiceModule],
})
export class EvaluateModule {}
