/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProductLogLine,
  emitProductLog,
  getObservabilityRoute,
} from './product-logger';
import { captureRequestIdFromResponse, resetRequestIdContextForTests } from './request-id';
import { UiErrorCodes } from './ui-error-codes';

describe('product-logger', () => {
  const prevApi = process.env.NEXT_PUBLIC_API_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = prevApi;
    resetRequestIdContextForTests();
    vi.restoreAllMocks();
  });

  it('getObservabilityRoute reads window.location.pathname', () => {
    window.history.pushState({}, '', '/?x=1');
    expect(getObservabilityRoute()).toBe('/');
  });

  it('emitProductLog writes structured JSON with service dating-ui', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    emitProductLog({
      level: 'trace',
      route: '/test',
      message: 'hello',
      errorCode: UiErrorCodes.UI_AUTH_BOOTSTRAP,
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line.service).toBe('dating-ui');
    expect(line.level).toBe('trace');
    expect(line.errorCode).toBe('UI_AUTH_BOOTSTRAP');
    expect(line.requestId).toBeNull();
  });

  it('captureRequestIdFromResponse attaches requestId to subsequent logs', () => {
    const res = new Response(null, {
      status: 200,
      headers: { 'x-request-id': 'abc-123' },
    });
    captureRequestIdFromResponse(res);
    const line = buildProductLogLine({
      level: 'trace',
      route: '/r',
      message: 'after fetch',
    });
    expect(line.requestId).toBe('abc-123');
  });

  it('failed fetch path logs exactly once (401 profile)', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    resetRequestIdContextForTests();
    const { fetchMyProfile } = await import('@/lib/api/me-profile-api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'x-request-id': 'req-one' }),
        text: async () => '',
      } as Response),
    );
    await expect(fetchMyProfile()).rejects.toThrow(/401/);
    const errorCalls = errSpy.mock.calls.map((c) => c[0] as string);
    const structured = errorCalls.filter((s) => {
      try {
        const o = JSON.parse(s);
        return o.errorCode === 'UI_PROFILE_GET_FAIL';
      } catch {
        return false;
      }
    });
    expect(structured).toHaveLength(1);
    const parsed = JSON.parse(structured[0]);
    expect(parsed.requestId).toBe('req-one');
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('expected profile_edit_blocked does not console.error', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    resetRequestIdContextForTests();
    vi.resetModules();
    const { patchMyProfile } = await import('@/lib/api/me-profile-api');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        headers: new Headers({ 'x-request-id': 'req-blocked' }),
        text: async () =>
          JSON.stringify({
            error: 'profile_edit_blocked',
            message: 'Profile editing is currently restricted',
          }),
      } as Response),
    );
    await expect(patchMyProfile({ aboutMe: 'x' })).rejects.toThrow(
      /restricted/i,
    );
    expect(errSpy).not.toHaveBeenCalled();
    const traced = logSpy.mock.calls
      .map((c) => c[0] as string)
      .filter((s) => {
        try {
          return JSON.parse(s).errorCode === 'UI_PROFILE_PATCH_FAIL';
        } catch {
          return false;
        }
      });
    expect(traced).toHaveLength(1);
    vi.unstubAllGlobals();
    vi.resetModules();
  });
});
