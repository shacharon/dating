import { Module } from '@nestjs/common';
import { EvaluateModule } from '../evaluate/evaluate.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { USER_PROFILES_REPOSITORY } from '../domain/repositories/user-profiles.repository';
import { InMemoryUserProfilesRepository } from '../infrastructure/repositories/in-memory/in-memory-user-profiles.repository';
import { ProfilesAnalyzeController } from './profiles-analyze.controller';
import { ProfilesController } from './profiles.controller';
import { ProfilesReadController } from './profiles-read.controller';
import { ProfilesJsonService } from './profiles-json.service';
import { AnalysisCacheService } from './analysis-cache.service';
import { AnalyzeFailuresPersistenceService } from './analyze-failures-persistence.service';
import { SeedProfilesService } from './seed-profiles.service';

@Module({
  imports: [SimpleLoggerModule, EvaluateModule],
  controllers: [ProfilesController, ProfilesReadController, ProfilesAnalyzeController],
  providers: [
    ProfilesJsonService,
    AnalysisCacheService,
    AnalyzeFailuresPersistenceService,
    {
      provide: USER_PROFILES_REPOSITORY,
      useClass: InMemoryUserProfilesRepository,
    },
    SeedProfilesService,
  ],
  exports: [ProfilesJsonService, SeedProfilesService, USER_PROFILES_REPOSITORY],
})
export class ProfilesModule {}
