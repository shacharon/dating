/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  OPENER_DRAFT_STORAGE_KEY,
  saveOpenerDraft,
  readOpenerDraft,
  clearOpenerDraft,
  conversationUrlWithStarter,
  starterFromSearchParam,
} from './conversation-opener-draft';

describe('conversation-opener-draft', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('round-trips save/read', () => {
    saveOpenerDraft({
      matchProfileId: 'prof-1',
      opener: 'Into hiking too?',
      savedAt: Date.now(),
    });
    expect(readOpenerDraft()).toEqual({
      matchProfileId: 'prof-1',
      opener: 'Into hiking too?',
      savedAt: Date.now(),
    });
  });

  it('expires after TTL', () => {
    saveOpenerDraft({
      matchProfileId: 'prof-1',
      opener: 'Hi',
      savedAt: Date.now(),
    });
    vi.setSystemTime(new Date('2026-08-05T12:31:00.000Z'));
    expect(readOpenerDraft()).toBeNull();
    expect(sessionStorage.getItem(OPENER_DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('clearOpenerDraft removes key', () => {
    saveOpenerDraft({
      matchProfileId: 'p',
      opener: 'x',
      savedAt: Date.now(),
    });
    clearOpenerDraft();
    expect(readOpenerDraft()).toBeNull();
  });

  it('conversationUrlWithStarter encodes opener', () => {
    expect(conversationUrlWithStarter('c1', 'a & b?')).toBe(
      `/dating/conversations/c1?starter=${encodeURIComponent('a & b?')}`,
    );
    expect(conversationUrlWithStarter('c1', '  ')).toBe(
      '/dating/conversations/c1',
    );
  });

  it('starterFromSearchParam trims without re-decoding', () => {
    expect(starterFromSearchParam('  Into hiking — 100%?  ')).toBe(
      'Into hiking — 100%?',
    );
    expect(starterFromSearchParam(null)).toBe('');
    expect(starterFromSearchParam('')).toBe('');
  });
});
