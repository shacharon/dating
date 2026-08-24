import { describe, it, expect } from 'vitest';
import {
  hostMatchesCdnPattern,
  shouldOptimizePhotoSrc,
} from '@/lib/matches/match-photo';

describe('shouldOptimizePhotoSrc', () => {
  it('returns false for relative paths', () => {
    expect(
      shouldOptimizePhotoSrc(
        '/api/v1/me/matches/p/photos/1/file',
        '*.cloudfront.net',
      ),
    ).toBe(false);
  });

  it('returns false when CDN env is empty', () => {
    expect(
      shouldOptimizePhotoSrc('https://d123.cloudfront.net/a.jpg', ''),
    ).toBe(false);
    expect(
      shouldOptimizePhotoSrc('https://d123.cloudfront.net/a.jpg', undefined),
    ).toBe(false);
  });

  it('returns false for absolute API-like hosts not on CDN list', () => {
    expect(
      shouldOptimizePhotoSrc(
        'http://127.0.0.1:3001/api/v1/me/matches/p/photos/1/file',
        '*.cloudfront.net',
      ),
    ).toBe(false);
  });

  it('returns true for CDN host exact match', () => {
    expect(
      shouldOptimizePhotoSrc(
        'https://cdn.example.com/photos/1.jpg',
        'cdn.example.com',
      ),
    ).toBe(true);
  });

  it('returns true for *.suffix wildcard', () => {
    expect(
      shouldOptimizePhotoSrc(
        'https://d111.cloudfront.net/x.jpg',
        '*.cloudfront.net',
      ),
    ).toBe(true);
  });

  it('never optimizes /api/.../photos/ paths even if host is on CDN list', () => {
    expect(
      shouldOptimizePhotoSrc(
        'https://d111.cloudfront.net/api/v1/me/matches/p/photos/1/file',
        '*.cloudfront.net',
      ),
    ).toBe(false);
  });
});

describe('hostMatchesCdnPattern', () => {
  it('matches exact and wildcard hosts', () => {
    expect(hostMatchesCdnPattern('cdn.example.com', 'cdn.example.com')).toBe(
      true,
    );
    expect(hostMatchesCdnPattern('a.cloudfront.net', '*.cloudfront.net')).toBe(
      true,
    );
    expect(hostMatchesCdnPattern('cloudfront.net', '*.cloudfront.net')).toBe(
      true,
    );
    expect(hostMatchesCdnPattern('evil.com', '*.cloudfront.net')).toBe(false);
  });
});
