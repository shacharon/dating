import { Module } from '@nestjs/common';
import { MessagingSocketRegistry } from './messaging-socket-registry.service';

/** Standalone registry so AuthModule can disconnect sockets on logout without importing MessagingRealtimeModule (avoids circular DI with MeProfileModule). */
@Module({
  providers: [MessagingSocketRegistry],
  exports: [MessagingSocketRegistry],
})
export class MessagingSocketRegistryModule {}
