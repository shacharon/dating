import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EvaluateServiceModule } from '../evaluate/evaluate-service.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { MeMatchesService } from './me-matches.service';
import { MeProfileAnalysisService } from './me-profile-analysis.service';
import { MeProfileMatchesService } from './me-profile-matches.service';
import { MeProfileController } from './me-profile.controller';
import { MeProfileService } from './me-profile.service';
import { MeProfileValidationPipe } from './me-profile-validation.pipe';

@Module({
  imports: [PrismaModule, SessionModule, UsersModule, AuthModule, EvaluateServiceModule],
  controllers: [MeProfileController],
  providers: [
    MeProfileService,
    MeProfileAnalysisService,
    MeProfileMatchesService,
    MeMatchesService,
    MeProfileValidationPipe,
  ],
})
export class MeProfileModule {}
