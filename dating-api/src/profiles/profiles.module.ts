import { Module } from '@nestjs/common';
import { EvaluateModule } from '../evaluate/evaluate.module';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { USER_PROFILES_REPOSITORY } from '../domain/repositories/user-profiles.repository';
import { PrismaUserProfilesRepository } from './infrastructure/prisma-user-profiles.repository';
import { ProfilesController } from './profiles.controller';
import { ProfilesJsonService } from './profiles-json.service';
import { ProfilesReadController } from './profiles-read.controller';
import { UserProfilesApiController } from './user-profiles-api.controller';
import { UserProfilesApiService } from './user-profiles-api.service';
import { UserProfilesApiRepository } from './infrastructure/user-profiles-api.repository';
import { ProfilesPrismaService } from './profiles-prisma.service';

@Module({
  imports: [SimpleLoggerModule, EvaluateModule],
  controllers: [
    ProfilesController,
    ProfilesReadController,
    UserProfilesApiController,
  ],
  providers: [
    UserProfilesApiRepository,
    UserProfilesApiService,
    ProfilesPrismaService,
    ProfilesJsonService,
    {
      provide: USER_PROFILES_REPOSITORY,
      useClass: PrismaUserProfilesRepository,
    },
  ],
  exports: [
    ProfilesPrismaService,
    USER_PROFILES_REPOSITORY,
    ProfilesJsonService,
  ],
})
export class ProfilesModule {}
