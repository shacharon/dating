export type ImageRemotePattern = {
  protocol?: 'http' | 'https';
  hostname: string;
  port?: string;
  pathname?: string;
  search?: string;
};

/**
 * Build `images.remotePatterns` for next.config (API absolute + CDN allowlist).
 * Keep in sync with Sprint 29 Story 4 architect lock.
 */
export function buildImageRemotePatterns(env: {
  apiUrl?: string;
  cdnHosts?: string;
} = {}): ImageRemotePattern[] {
  const patterns: ImageRemotePattern[] = [];
  const apiRaw = (env.apiUrl ?? process.env.NEXT_PUBLIC_API_URL)?.trim();
  if (apiRaw) {
    try {
      const u = new URL(apiRaw);
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        const entry: ImageRemotePattern = {
          protocol: u.protocol.replace(':', '') as 'http' | 'https',
          hostname: u.hostname,
          pathname: '/api/**',
        };
        if (u.port) {
          entry.port = u.port;
        }
        patterns.push(entry);
      }
    } catch {
      // ignore invalid NEXT_PUBLIC_API_URL
    }
  }

  const cdnRaw = (env.cdnHosts ?? process.env.NEXT_PUBLIC_PHOTO_CDN_HOSTS)?.trim();
  if (cdnRaw) {
    for (const part of cdnRaw.split(',')) {
      const host = part.trim().toLowerCase();
      if (!host) continue;
      const isLocal =
        host === 'localhost' ||
        host.startsWith('127.') ||
        host === '0.0.0.0';
      patterns.push({
        protocol: isLocal ? 'http' : 'https',
        hostname: host,
        pathname: '/**',
      });
      if (isLocal) {
        patterns.push({
          protocol: 'https',
          hostname: host,
          pathname: '/**',
        });
      }
    }
  }

  return patterns;
}
