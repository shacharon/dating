import { describe, expect, it } from 'vitest';
import {
  formatNavBadgeCount,
  isConversationsActive,
  isMatchesActive,
  isProfileActive,
} from './nav-active';

describe('nav-active', () => {
  it('matches active routes', () => {
    expect(isMatchesActive('/dating/me-matches')).toBe(true);
    expect(isMatchesActive('/dating/me-matches/abc')).toBe(true);
    expect(isMatchesActive('/dating/matches/abc')).toBe(true);
    expect(isMatchesActive('/dating')).toBe(false);
    expect(isMatchesActive('/dating/conversations')).toBe(false);
  });

  it('conversations active routes', () => {
    expect(isConversationsActive('/dating/conversations')).toBe(true);
    expect(isConversationsActive('/dating/conversations/xyz')).toBe(true);
    expect(isConversationsActive('/dating/me-matches')).toBe(false);
  });

  it('profile active routes', () => {
    expect(isProfileActive('/dating/profile')).toBe(true);
    expect(isProfileActive('/settings/profile/basic')).toBe(true);
    expect(isProfileActive('/profile')).toBe(true);
    expect(isProfileActive('/dating/analysis')).toBe(false);
  });

  it('formats badge counts', () => {
    expect(formatNavBadgeCount(3)).toBe('3');
    expect(formatNavBadgeCount(99)).toBe('99');
    expect(formatNavBadgeCount(100)).toBe('99+');
  });
});
