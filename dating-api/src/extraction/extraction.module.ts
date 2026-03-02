import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ExtractionService } from './extraction.service';

@Module({
  imports: [LlmModule],
  providers: [ExtractionService],
  exports: [ExtractionService],
})
export class ExtractionModule {}
