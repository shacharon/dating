import { MessageEmailDebounceService } from './message-email-debounce.service';
import type { EmailNotificationConfigService } from './email-notification-config.service';

describe('MessageEmailDebounceService', () => {
  const config = {
    messageDebounceMinutes: 15,
  } as EmailNotificationConfigService;

  let service: MessageEmailDebounceService;

  beforeEach(() => {
    service = new MessageEmailDebounceService(config);
    service.resetForTests();
  });

  it('allows first send for a conversation recipient pair', () => {
    expect(service.shouldSend('conv_1', 'user_recipient')).toBe(true);
  });

  it('blocks second send within debounce window', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    service.recordSent('conv_1', 'user_recipient');
    expect(service.shouldSend('conv_1', 'user_recipient')).toBe(false);

    jest.restoreAllMocks();
  });

  it('allows send after debounce window expires', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);

    service.recordSent('conv_1', 'user_recipient');

    jest.spyOn(Date, 'now').mockReturnValue(now + 15 * 60 * 1000 + 1);
    expect(service.shouldSend('conv_1', 'user_recipient')).toBe(true);

    jest.restoreAllMocks();
  });

  it('tracks debounce independently per conversation and recipient', () => {
    service.recordSent('conv_1', 'user_a');
    expect(service.shouldSend('conv_1', 'user_b')).toBe(true);
    expect(service.shouldSend('conv_2', 'user_a')).toBe(true);
  });
});
