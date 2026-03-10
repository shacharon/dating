import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ContradictionController } from './contradiction.controller';
import { ContradictionService } from './contradiction.service';

@Module({
  imports: [LlmModule],
  controllers: [ContradictionController],
  providers: [ContradictionService],
  exports: [ContradictionService],
})
export class ContradictionModule {}
