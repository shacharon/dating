import { Module } from '@nestjs/common';
import { LlmModule } from '../llm/llm.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ExtractionService } from './extraction.service';
import { InterestsExtractionService } from './interests-extraction.service';
import { NegativesExtractionService } from './negatives-extraction.service';
import { ExtractionV2Service } from './extraction-v2.service';
import { ExtractionV2PersistenceService } from './extraction-v2-persistence.service';

@Module({
  imports: [LlmModule, PrismaModule],
  providers: [
    ExtractionService,
    InterestsExtractionService,
    NegativesExtractionService,
    ExtractionV2Service,
    ExtractionV2PersistenceService,
  ],
  exports: [
    ExtractionService,
    InterestsExtractionService,
    NegativesExtractionService,
    ExtractionV2Service,
    ExtractionV2PersistenceService,
  ],
})
export class ExtractionModule {}
