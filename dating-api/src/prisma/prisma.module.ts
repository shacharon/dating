import { Global, Module } from '@nestjs/common';
import { StructuredLoggingModule } from '../logging/structured-logging.module';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  imports: [StructuredLoggingModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
