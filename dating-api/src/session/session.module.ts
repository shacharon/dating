import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaSessionConnectionReadRepository } from './repositories/prisma-session-connection-read.repository';
import { SESSION_CONNECTION_READ } from './repositories/session-connection-read.repository';
import { SessionService } from './session.service';

@Module({
  imports: [PrismaModule],
  providers: [
    SessionService,
    {
      provide: SESSION_CONNECTION_READ,
      useClass: PrismaSessionConnectionReadRepository,
    },
  ],
  exports: [SessionService, SESSION_CONNECTION_READ],
})
export class SessionModule {}
