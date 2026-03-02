import { Global, Module } from '@nestjs/common';
import { SimpleLogger } from './simple-logger.service';

@Global()
@Module({
  providers: [SimpleLogger],
  exports: [SimpleLogger],
})
export class SimpleLoggerModule {}
