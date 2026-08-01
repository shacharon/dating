export { conversationPhotoSrc as matchPhotoSrc } from '@/lib/conversations-api';

/** First visible character for photo placeholder initials. */
export function matchPhotoPlaceholderInitial(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toUpperCase();
}

function parseCdnHostPatterns(
  raw: string | undefined = process.env.NEXT_PUBLIC_PHOTO_CDN_HOSTS,
): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * True when `src` is an absolute http(s) URL whose host is on
 * `NEXT_PUBLIC_PHOTO_CDN_HOSTS` (comma-separated; `*.example.com` suffix match).
 * Relative / API / unknown hosts → false (cookie-auth bytes must not hit the optimizer).
 */
export function shouldOptimizePhotoSrc(
  src: string,
  cdnHostsEnv?: string,
): boolean {
  if (!/^https?:\/\//i.test(src)) {
    return false;
  }
  let hostname: string;
  try {
    hostname = new URL(src).hostname.toLowerCase();
  } catch {
    return false;
  }
  const patterns = parseCdnHostPatterns(cdnHostsEnv);
  if (patterns.length === 0) {
    return false;
  }
  return patterns.some((pattern) => hostMatchesCdnPattern(hostname, pattern));
}

export function hostMatchesCdnPattern(
  hostname: string,
  pattern: string,
): boolean {
  const p = pattern.toLowerCase();
  if (p.startsWith('*.')) {
    const suffix = p.slice(1); // ".cloudfront.net"
    return hostname === p.slice(2) || hostname.endsWith(suffix);
  }
  return hostname === p;
}
