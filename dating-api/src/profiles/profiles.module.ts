import { Module } from '@nestjs/common';
import { EvaluateModule } from '../evaluate/evaluate.module';
import { ExtractionModule } from '../extraction/extraction.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { USER_PROFILES_REPOSITORY } from '../domain/repositories/user-profiles.repository';
import { PrismaUserProfilesRepository } from './infrastructure/prisma-user-profiles.repository';
import { ProfilesAnalyzeController } from './profiles-analyze.controller';
import { ProfilesController } from './profiles.controller';
import { ProfilesReadController } from './profiles-read.controller';
import { UserProfilesApiController } from './user-profiles-api.controller';
import { UserProfilesApiService } from './user-profiles-api.service';
import { UserProfilesApiRepository } from './infrastructure/user-profiles-api.repository';
import { ProfilesJsonService } from './profiles-json.service';
import { ProfilesPrismaService } from './profiles-prisma.service';
import { AnalysisCacheService } from './analysis-cache.service';
import { AnalyzeFailuresPersistenceService } from './analyze-failures-persistence.service';
import { SeedProfilesService } from './seed-profiles.service';

@Module({
  imports: [SimpleLoggerModule, EvaluateModule, ExtractionModule],
  controllers: [
    ProfilesController,
    ProfilesReadController,
    ProfilesAnalyzeController,
    UserProfilesApiController,
  ],
  providers: [
    UserProfilesApiRepository,
    UserProfilesApiService,
    ProfilesJsonService,
    ProfilesPrismaService,
    AnalysisCacheService,
    AnalyzeFailuresPersistenceService,
    {
      provide: USER_PROFILES_REPOSITORY,
      useClass: PrismaUserProfilesRepository,
    },
    SeedProfilesService,
  ],
  exports: [ProfilesJsonService, ProfilesPrismaService, SeedProfilesService, USER_PROFILES_REPOSITORY],
})
export class ProfilesModule {}
