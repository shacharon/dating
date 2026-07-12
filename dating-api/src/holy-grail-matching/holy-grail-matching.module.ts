import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HolyGrailRetrievalService } from './retrieval/holy-grail-retrieval.service';
import { HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY } from './retrieval/holy-grail-profile-source.repository';
import { PrismaHolyGrailProfileSourceRepository } from './retrieval/prisma-holy-grail-profile-source.repository';
import { HolyGrailStructuredWriteService } from './holy-grail-structured-write.service';

@Module({
  imports: [PrismaModule],
  providers: [
    HolyGrailStructuredWriteService,
    PrismaHolyGrailProfileSourceRepository,
    {
      provide: HOLY_GRAIL_PROFILE_SOURCE_REPOSITORY,
      useExisting: PrismaHolyGrailProfileSourceRepository,
    },
    HolyGrailRetrievalService,
  ],
  exports: [HolyGrailRetrievalService, HolyGrailStructuredWriteService],
})
export class HolyGrailMatchingModule {}
