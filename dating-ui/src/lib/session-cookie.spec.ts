/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';
import { getSessionCookieName, hasSessionCookie } from './session-cookie';

describe('session-cookie', () => {
  afterEach(() => {
    document.cookie = '';
  });

  it('getSessionCookieName defaults to dating_session', () => {
    expect(getSessionCookieName()).toBe('dating_session');
  });

  it('hasSessionCookie is false when cookie missing', () => {
    document.cookie = '';
    expect(hasSessionCookie()).toBe(false);
  });

  it('hasSessionCookie is false when cookie value is empty', () => {
    const name = getSessionCookieName();
    document.cookie = `${name}=`;
    expect(hasSessionCookie()).toBe(false);
  });

  it('hasSessionCookie is true when session cookie present', () => {
    const name = getSessionCookieName();
    document.cookie = `${name}=abc123`;
    expect(hasSessionCookie()).toBe(true);
  });
});
