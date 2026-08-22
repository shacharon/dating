import { Global, Module } from '@nestjs/common';
import { JwtAuthConfigService } from './jwt-auth-config.service';

@Global()
@Module({
  providers: [JwtAuthConfigService],
  exports: [JwtAuthConfigService],
})
export class JwtAuthConfigModule {}
