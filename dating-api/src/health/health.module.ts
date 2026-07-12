import { Module } from '@nestjs/common';
import { MessagingRealtimeModule } from '../messaging-realtime/messaging-realtime.module';
import { HealthController } from './health.controller';

@Module({
  imports: [MessagingRealtimeModule],
  controllers: [HealthController],
})
export class HealthModule {}
