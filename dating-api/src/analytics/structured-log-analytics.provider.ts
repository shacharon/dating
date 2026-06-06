import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SimpleLogger } from '../logger/simple-logger.service';
import { getRequestLogFields } from '../logging/request-log-context';
import type { AnalyticsProvider } from './analytics-provider.interface';
import type {
  ProductAnalyticsEventName,
  ProductAnalyticsLogLine,
  ProductAnalyticsProperties,
} from './product-analytics.events';

@Injectable()
export class StructuredLogAnalyticsProvider implements AnalyticsProvider {
  private readonly serviceName: string;
  private readonly envName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: SimpleLogger,
  ) {
    this.serviceName =
      this.config.get<string>('SERVICE_NAME')?.trim() || 'dating-api';
    this.envName =
      this.config.get<string>('NODE_ENV')?.trim() || 'development';
  }

  capture(
    event: ProductAnalyticsEventName,
    userId: string,
    properties: ProductAnalyticsProperties,
  ): void {
    const ctx = getRequestLogFields();
    const line: ProductAnalyticsLogLine = {
      timestamp: new Date().toISOString(),
      logKind: 'product_analytics',
      service: this.serviceName,
      env: this.envName,
      event,
      userId,
      properties,
      requestId: ctx?.requestId ?? null,
    };
    this.logger.emitJsonLine(line);
  }
}
