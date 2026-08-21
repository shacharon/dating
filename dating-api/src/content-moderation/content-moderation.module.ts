import { Module } from '@nestjs/common';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CONTENT_MODERATION } from './content-moderation.ports';
import { ContentViolationService } from './content-violation.service';
import { OpenAIModerationClient } from './openai-moderation.client';
import { CONTENT_VIOLATION_REPOSITORY } from './repositories/content-violation.repository';
import { PrismaContentViolationRepository } from './repositories/prisma-content-violation.repository';

@Module({
  imports: [PrismaModule, StructuredLoggingModule],
  providers: [
    OpenAIModerationClient,
    { provide: CONTENT_MODERATION, useExisting: OpenAIModerationClient },
    {
      provide: CONTENT_VIOLATION_REPOSITORY,
      useClass: PrismaContentViolationRepository,
    },
    ContentViolationService,
  ],
  exports: [
    CONTENT_MODERATION,
    OpenAIModerationClient,
    ContentViolationService,
    CONTENT_VIOLATION_REPOSITORY,
  ],
})
export class ContentModerationModule {}
