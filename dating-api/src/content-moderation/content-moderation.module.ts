import { Module } from '@nestjs/common';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CONTENT_MODERATION } from './content-moderation.ports';
import { ContentViolationService } from './content-violation.service';
import { OpenAIModerationClient } from './openai-moderation.client';

@Module({
  imports: [PrismaModule, StructuredLoggingModule],
  providers: [
    OpenAIModerationClient,
    { provide: CONTENT_MODERATION, useExisting: OpenAIModerationClient },
    ContentViolationService,
  ],
  exports: [
    CONTENT_MODERATION,
    OpenAIModerationClient,
    ContentViolationService,
  ],
})
export class ContentModerationModule {}
