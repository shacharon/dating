import { Module } from '@nestjs/common';
import { ExtractionModule } from '../extraction/extraction.module';
import { LlmModule } from '../llm/llm.module';
import { EvaluateController } from './evaluate.controller';
import { EvaluateService } from './evaluate.service';

@Module({
  imports: [LlmModule, ExtractionModule],
  controllers: [EvaluateController],
  providers: [EvaluateService],
})
export class EvaluateModule {}
