import {
  decodePresenceMeta,
  encodePresenceMeta,
  presenceMetaKey,
  presenceSessionKey,
  presenceUserKey,
  PRESENCE_TTL_SECONDS,
} from './messaging-presence.keys';

describe('messaging-presence.keys', () => {
  it('builds stable key prefixes', () => {
    expect(presenceUserKey('u1')).toBe('ws:presence:user:u1');
    expect(presenceSessionKey('s1')).toBe('ws:presence:session:s1');
    expect(presenceMetaKey('sock')).toBe('ws:presence:meta:sock');
    expect(PRESENCE_TTL_SECONDS).toBe(90);
  });

  it('round-trips meta encode/decode', () => {
    const raw = encodePresenceMeta('user_a', 'sess_b');
    expect(decodePresenceMeta(raw)).toEqual({
      userId: 'user_a',
      sessionId: 'sess_b',
    });
  });

  it('rejects malformed meta', () => {
    expect(decodePresenceMeta(null)).toBeNull();
    expect(decodePresenceMeta('')).toBeNull();
    expect(decodePresenceMeta('nopesplit')).toBeNull();
    expect(decodePresenceMeta('|sess')).toBeNull();
  });

  it('decodes bearer meta with empty session segment', () => {
    expect(decodePresenceMeta('user_a|')).toEqual({
      userId: 'user_a',
      sessionId: undefined,
    });
  });
});
