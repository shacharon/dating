import type { Request } from 'express';
import { resolveClientIp } from './request-client-ip.util';

function mockRequest(partial: Partial<Request>): Request {
  return partial as Request;
}

describe('resolveClientIp', () => {
  it('uses first hop from x-forwarded-for string', () => {
    const req = mockRequest({
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
    });
    expect(resolveClientIp(req)).toBe('203.0.113.1');
  });

  it('uses first element from x-forwarded-for array', () => {
    const req = mockRequest({
      headers: { 'x-forwarded-for': ['198.51.100.2', '10.0.0.2'] },
      socket: { remoteAddress: '127.0.0.1' },
    });
    expect(resolveClientIp(req)).toBe('198.51.100.2');
  });

  it('falls back to socket remoteAddress', () => {
    const req = mockRequest({
      headers: {},
      socket: { remoteAddress: '192.0.2.3' },
    });
    expect(resolveClientIp(req)).toBe('192.0.2.3');
  });

  it('returns unknown when no address available', () => {
    const req = mockRequest({
      headers: {},
      socket: { remoteAddress: undefined },
    });
    expect(resolveClientIp(req)).toBe('unknown');
  });
});
