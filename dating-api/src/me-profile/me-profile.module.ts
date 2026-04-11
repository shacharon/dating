import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionModule } from '../session/session.module';
import { UsersModule } from '../users/users.module';
import { MeProfileController } from './me-profile.controller';
import { MeProfileService } from './me-profile.service';

@Module({
  imports: [PrismaModule, SessionModule, UsersModule, AuthModule],
  controllers: [MeProfileController],
  providers: [MeProfileService],
})
export class MeProfileModule {}
