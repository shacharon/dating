import { Module } from '@nestjs/common';
import { MessagingRealtimeModule } from '../messaging-realtime/messaging-realtime.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [MessagingRealtimeModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
