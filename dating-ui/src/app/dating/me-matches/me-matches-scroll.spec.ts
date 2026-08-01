/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MATCHES_SCROLL_RESTORE_KEY,
  MATCHES_SCROLL_Y_KEY,
  applyMatchesScrollY,
  clearMatchesScrollState,
  consumeMatchesScrollRestore,
  markMatchesScrollForRestore,
} from './me-matches-scroll';

describe('me-matches-scroll', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('markMatchesScrollForRestore writes scrollY and restore flag', () => {
    markMatchesScrollForRestore(420);
    expect(sessionStorage.getItem(MATCHES_SCROLL_Y_KEY)).toBe('420');
    expect(sessionStorage.getItem(MATCHES_SCROLL_RESTORE_KEY)).toBe('1');
  });

  it('consumeMatchesScrollRestore returns Y once then clears', () => {
    markMatchesScrollForRestore(180);
    expect(consumeMatchesScrollRestore()).toBe(180);
    expect(sessionStorage.getItem(MATCHES_SCROLL_Y_KEY)).toBeNull();
    expect(sessionStorage.getItem(MATCHES_SCROLL_RESTORE_KEY)).toBeNull();
    expect(consumeMatchesScrollRestore()).toBeNull();
  });

  it('consume without restore flag clears stale scrollY and returns null', () => {
    sessionStorage.setItem(MATCHES_SCROLL_Y_KEY, '999');
    expect(consumeMatchesScrollRestore()).toBeNull();
    expect(sessionStorage.getItem(MATCHES_SCROLL_Y_KEY)).toBeNull();
  });

  it('clearMatchesScrollState removes both keys', () => {
    markMatchesScrollForRestore(10);
    clearMatchesScrollState();
    expect(sessionStorage.getItem(MATCHES_SCROLL_Y_KEY)).toBeNull();
    expect(sessionStorage.getItem(MATCHES_SCROLL_RESTORE_KEY)).toBeNull();
  });

  it('applyMatchesScrollY clamps to max scroll', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      get: () => 500,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: () => 200,
    });

    applyMatchesScrollY(9999);
    expect(scrollTo).toHaveBeenCalledWith(0, 300);
  });

  it('rejects invalid stored Y', () => {
    sessionStorage.setItem(MATCHES_SCROLL_RESTORE_KEY, '1');
    sessionStorage.setItem(MATCHES_SCROLL_Y_KEY, 'nope');
    expect(consumeMatchesScrollRestore()).toBeNull();
  });
});
