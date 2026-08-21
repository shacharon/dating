import { Module } from '@nestjs/common';
import { MessagingSocketRegistry } from './messaging-socket-registry.service';
import { RealtimePublisher } from './realtime-publisher.service';

/**
 * Standalone registry + publisher so AuthModule / MeAccount can force-disconnect
 * without importing MessagingRealtimeModule (avoids circular DI with MeProfileModule).
 */
@Module({
  providers: [MessagingSocketRegistry, RealtimePublisher],
  exports: [MessagingSocketRegistry, RealtimePublisher],
})
export class MessagingSocketRegistryModule {}
