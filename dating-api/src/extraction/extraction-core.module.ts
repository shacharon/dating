/**
 * Pure extraction module for the active product path.
 *
 * Provides only LLM-based signal extraction services — no DB persistence.
 * Legacy ExtractionModule / V2 analyze stack removed in Sprint 7 Story 1.
 */
import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { ExtractionService } from './extraction.service';

@Module({
  imports: [LlmModule],
  providers: [ExtractionService],
  exports: [ExtractionService],
})
export class ExtractionCoreModule {}
