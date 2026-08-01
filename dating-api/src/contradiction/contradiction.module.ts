import { Module } from '@nestjs/common';
import { AdminAuthModule } from '../admin/admin-auth.module';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { ContradictionController } from './contradiction.controller';
import { ContradictionService } from './contradiction.service';

@Module({
  imports: [LlmModule, AuthModule, AdminAuthModule],
  controllers: [ContradictionController],
  providers: [ContradictionService],
  exports: [ContradictionService],
})
export class ContradictionModule {}
