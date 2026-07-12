import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  matchPhotoPlaceholderInitial,
  matchPhotoSrc,
} from '@/lib/match-photo';

vi.mock('@/lib/conversations-api', () => ({
  conversationPhotoSrc: (url: string | null) =>
    url ? `https://api.test${url}` : null,
}));

describe('matchPhotoSrc', () => {
  it('delegates to conversationPhotoSrc', () => {
    expect(matchPhotoSrc('/api/v1/me/matches/p1/photos/ph1/file')).toBe(
      'https://api.test/api/v1/me/matches/p1/photos/ph1/file',
    );
    expect(matchPhotoSrc(null)).toBeNull();
  });
});

describe('matchPhotoPlaceholderInitial', () => {
  it('returns uppercase first letter of trimmed name', () => {
    expect(matchPhotoPlaceholderInitial('rivka')).toBe('R');
    expect(matchPhotoPlaceholderInitial('  dan  ')).toBe('D');
  });

  it('returns ? when name is empty', () => {
    expect(matchPhotoPlaceholderInitial('')).toBe('?');
    expect(matchPhotoPlaceholderInitial('   ')).toBe('?');
  });
});
