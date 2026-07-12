import { ConfigService } from '@nestjs/config';
import { SimpleLogger } from '../logger/simple-logger.service';
import { ProductAnalyticsEvents } from './product-analytics.events';
import { StructuredLogAnalyticsProvider } from './structured-log-analytics.provider';

describe('StructuredLogAnalyticsProvider', () => {
  it('emits product_analytics JSON line via SimpleLogger', () => {
    const emitJsonLine = jest.fn();
    const logger = { emitJsonLine } as unknown as SimpleLogger;
    const config = {
      get: jest.fn((key: string) =>
        key === 'SERVICE_NAME' ? 'dating-api-test' : 'test',
      ),
    } as unknown as ConfigService;

    const provider = new StructuredLogAnalyticsProvider(config, logger);
    provider.capture(ProductAnalyticsEvents.MESSAGE_SENT, 'user_1', {
      conversationIdHash: 'deadbeef01234567',
    });

    expect(emitJsonLine).toHaveBeenCalledTimes(1);
    const line = emitJsonLine.mock.calls[0][0] as Record<string, unknown>;
    expect(line).toMatchObject({
      logKind: 'product_analytics',
      service: 'dating-api-test',
      env: 'test',
      event: ProductAnalyticsEvents.MESSAGE_SENT,
      userId: 'user_1',
      properties: { conversationIdHash: 'deadbeef01234567' },
    });
    expect(line).not.toHaveProperty('message');
    expect(line.properties).not.toHaveProperty('text');
  });
});
