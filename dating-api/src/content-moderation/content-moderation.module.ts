import { Module } from '@nestjs/common';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ContentViolationService } from './content-violation.service';
import { OpenAIModerationClient } from './openai-moderation.client';

@Module({
  imports: [PrismaModule, StructuredLoggingModule],
  providers: [OpenAIModerationClient, ContentViolationService],
  exports: [OpenAIModerationClient, ContentViolationService],
})
export class ContentModerationModule {}
