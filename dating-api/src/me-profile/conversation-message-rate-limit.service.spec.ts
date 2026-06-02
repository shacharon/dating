import { HttpException, HttpStatus } from '@nestjs/common';
import { ConversationMessageRateLimitService } from './conversation-message-rate-limit.service';
import {
  MESSAGE_RATE_LIMIT_MAX_PER_WINDOW,
  MESSAGE_RATE_LIMIT_WINDOW_MS,
} from './conversation-message.constants';

describe('ConversationMessageRateLimitService', () => {
  let service: ConversationMessageRateLimitService;

  beforeEach(() => {
    service = new ConversationMessageRateLimitService();
    service.resetForTests();
  });

  it('allows first send in a window after assertCanSend and recordSend', () => {
    expect(() => service.assertCanSend('user_a')).not.toThrow();
    service.recordSend('user_a');
    expect(() => service.assertCanSend('user_a')).not.toThrow();
  });

  it('throws HttpException 429 on 11th assertCanSend within the same window', () => {
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      service.assertCanSend('user_a');
      service.recordSend('user_a');
    }

    expect(() => service.assertCanSend('user_a')).toThrow(HttpException);
    const ex = (() => {
      try {
        service.assertCanSend('user_a');
        return null;
      } catch (e) {
        return e;
      }
    })();
    expect(ex).toBeInstanceOf(HttpException);
    expect((ex as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    expect((ex as HttpException).getResponse()).toEqual({
      message: 'Too many messages. Please wait.',
    });
  });

  it('allows send again after the rate-limit window expires', () => {
    jest.useFakeTimers();
    const start = Date.now();
    jest.setSystemTime(start);

    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      service.assertCanSend('user_a');
      service.recordSend('user_a');
    }
    expect(() => service.assertCanSend('user_a')).toThrow(HttpException);

    jest.setSystemTime(start + MESSAGE_RATE_LIMIT_WINDOW_MS + 1);
    expect(() => service.assertCanSend('user_a')).not.toThrow();

    jest.useRealTimers();
  });

  it('resetForTests clears rate-limit state', () => {
    for (let i = 0; i < MESSAGE_RATE_LIMIT_MAX_PER_WINDOW; i++) {
      service.recordSend('user_a');
    }
    expect(() => service.assertCanSend('user_a')).toThrow(HttpException);

    service.resetForTests();
    expect(() => service.assertCanSend('user_a')).not.toThrow();
  });
});
