import { describe, it, expect } from 'vitest';
import { buildImageRemotePatterns } from '@/lib/platform/image-remote-patterns';

describe('buildImageRemotePatterns', () => {
  it('adds API host pathname /api/** when NEXT_PUBLIC_API_URL set', () => {
    const patterns = buildImageRemotePatterns({
      apiUrl: 'http://127.0.0.1:3001',
      cdnHosts: '',
    });
    expect(patterns).toEqual([
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '3001',
        pathname: '/api/**',
      },
    ]);
  });

  it('adds CDN hosts as https /** patterns', () => {
    const patterns = buildImageRemotePatterns({
      apiUrl: '',
      cdnHosts: 'cdn.example.com,*.cloudfront.net',
    });
    expect(patterns).toEqual([
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        pathname: '/**',
      },
    ]);
  });
});
