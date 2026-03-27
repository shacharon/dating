import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ExtractionService } from './extraction.service';
import { InterestsExtractionService } from './interests-extraction.service';

@Module({
  imports: [LlmModule],
  providers: [ExtractionService, InterestsExtractionService],
  exports: [ExtractionService, InterestsExtractionService],
})
export class ExtractionModule {}
