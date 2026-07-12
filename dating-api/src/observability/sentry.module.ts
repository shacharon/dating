import { Global, Module } from '@nestjs/common';
import { SentryBridgeService } from './sentry-bridge.service';
import { SentryConfigService } from './sentry-config.service';

@Global()
@Module({
  providers: [SentryConfigService, SentryBridgeService],
  exports: [SentryConfigService, SentryBridgeService],
})
export class SentryModule {}
