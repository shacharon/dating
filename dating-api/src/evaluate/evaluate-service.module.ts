/**
 * Lightweight module that provides and exports only EvaluateService.
 * Import this module (instead of EvaluateModule) when you need EvaluateService
 * without pulling in EvaluateController's LegacyBackendAdapter dependency.
 *
 * Uses ExtractionCoreModule (pure LLM extraction, no DB persistence).
 * Legacy ExtractionModule / V2 analyze stack removed in Sprint 7 Story 1.
 */
import { Module } from '@nestjs/common';
import { ExtractionCoreModule } from '../extraction/extraction-core.module';
import { LlmModule } from '../llm/llm.module';
import { EvaluateService } from './evaluate.service';

@Module({
  imports: [LlmModule, ExtractionCoreModule],
  providers: [EvaluateService],
  exports: [EvaluateService],
})
export class EvaluateServiceModule {}
