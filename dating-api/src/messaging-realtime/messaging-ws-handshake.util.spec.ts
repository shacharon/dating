import { readHandshakeAccessToken, type Handshake } from './messaging-ws-handshake.util';

describe('readHandshakeAccessToken', () => {
  it('prefers handshake.auth.token over query', () => {
    const handshake = {
      auth: { token: '  auth-token  ' },
      query: { token: 'query-token' },
    } as Handshake;
    expect(readHandshakeAccessToken(handshake)).toBe('auth-token');
  });

  it('reads query token when auth token absent', () => {
    const handshake = {
      query: { token: 'query-only' },
    } as Handshake;
    expect(readHandshakeAccessToken(handshake)).toBe('query-only');
  });

  it('reads first element when query token is array', () => {
    const handshake = {
      query: { token: ['first', 'second'] },
    } as Handshake;
    expect(readHandshakeAccessToken(handshake)).toBe('first');
  });

  it('returns null when no token present', () => {
    expect(readHandshakeAccessToken({} as Handshake)).toBeNull();
  });
});
