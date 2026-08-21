import {
  emailMsgDebounceKey,
  emailMsgDebounceTtlSeconds,
} from './email-debounce.keys';

describe('email-debounce.keys', () => {
  it('builds stable debounce keys', () => {
    expect(emailMsgDebounceKey('conv_1', 'user_a')).toBe(
      'email:msgdebounce:conv_1:user_a',
    );
  });

  it('ttl uses minutes with 60s floor', () => {
    expect(emailMsgDebounceTtlSeconds(15)).toBe(900);
    expect(emailMsgDebounceTtlSeconds(0.5)).toBe(60);
    expect(emailMsgDebounceTtlSeconds(0)).toBe(900);
    expect(emailMsgDebounceTtlSeconds(NaN)).toBe(900);
  });
});
