/**
 * Pure extraction module for the active product path.
 *
 * Provides only LLM-based signal extraction services — no DB persistence.
 * Import this module (instead of ExtractionModule) when legacy
 * ProfileExtractionV2 / ProfileSignalSnapshot writes must not enter scope.
 *
 * ExtractionModule (which additionally registers ExtractionV2PersistenceService,
 * ExtractionV2Service, InterestsExtractionService, NegativesExtractionService)
 * remains unchanged for the legacy profile/analyze routes.
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
