/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';
import { getSessionCookieName, hasSessionCookie } from './session-cookie';

describe('session-cookie', () => {
  it('hasSessionCookie is false when cookie missing', () => {
    document.cookie = '';
    expect(hasSessionCookie()).toBe(false);
  });

  it('hasSessionCookie is true when session cookie present', () => {
    const name = getSessionCookieName();
    document.cookie = `${name}=abc123`;
    expect(hasSessionCookie()).toBe(true);
  });
});
