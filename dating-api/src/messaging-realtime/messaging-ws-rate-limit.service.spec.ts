import { MessagingWsRateLimitService } from './messaging-ws-rate-limit.service';
import { WsRateLimitExceededError } from './messaging-ws-rate-limit.error';
import {
  WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW,
  WS_INBOUND_RATE_LIMIT_WINDOW_MS,
} from './messaging-ws-inbound.constants';

describe('MessagingWsRateLimitService', () => {
  let service: MessagingWsRateLimitService;

  beforeEach(() => {
    service = new MessagingWsRateLimitService();
    service.resetForTests();
  });

  it('allows events under the limit', () => {
    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW - 1; i++) {
      service.assertCanReceive('user_a');
      service.recordReceive('user_a');
    }
    expect(() => service.assertCanReceive('user_a')).not.toThrow();
  });

  it('throws when limit exceeded in window', () => {
    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      service.assertCanReceive('user_a');
      service.recordReceive('user_a');
    }
    service.recordReceive('user_a');

    expect(() => service.assertCanReceive('user_a')).toThrow(
      WsRateLimitExceededError,
    );
  });

  it('resets after window expires', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    for (let i = 0; i < WS_INBOUND_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      service.recordReceive('user_a');
    }
    service.recordReceive('user_a');

    jest
      .spyOn(Date, 'now')
      .mockReturnValue(now + WS_INBOUND_RATE_LIMIT_WINDOW_MS + 1);

    expect(() => service.assertCanReceive('user_a')).not.toThrow();

    jest.restoreAllMocks();
  });
});
