import { Global, Module } from '@nestjs/common';
import { AuthSessionConfigService } from './auth-session-config.service';

@Global()
@Module({
  providers: [AuthSessionConfigService],
  exports: [AuthSessionConfigService],
})
export class AuthSessionConfigModule {}
