import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { SimpleLoggerModule } from '../logger/simple-logger.module';
import { ObservabilityExceptionFilter } from './observability-exception.filter';
import { StructuredObservabilityService } from './structured-observability.service';

@Global()
@Module({
  imports: [SimpleLoggerModule],
  providers: [
    StructuredObservabilityService,
    {
      provide: APP_FILTER,
      useClass: ObservabilityExceptionFilter,
    },
  ],
  exports: [StructuredObservabilityService],
})
export class StructuredLoggingModule {}
