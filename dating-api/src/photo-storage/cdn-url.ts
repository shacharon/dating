import { createSign } from 'node:crypto';

export type CdnUrlConfig = {
  enabled: boolean;
  distributionDomain: string | null;
  keyPairId: string | null;
  /** PEM private key for CloudFront signed URLs */
  privateKeyPem: string | null;
  /** Signature TTL seconds (default 3600) */
  ttlSeconds: number;
};

export function loadCdnUrlConfig(
  env: NodeJS.ProcessEnv = process.env,
): CdnUrlConfig {
  const enabled =
    env.PHOTO_CDN_ENABLED === '1' || env.PHOTO_CDN_ENABLED === 'true';
  const privateKeyPem = env.PHOTO_CDN_PRIVATE_KEY?.replace(/\\n/g, '\n') ?? null;
  return {
    enabled,
    distributionDomain: env.PHOTO_CDN_DOMAIN?.trim() || null,
    keyPairId: env.PHOTO_CDN_KEY_PAIR_ID?.trim() || null,
    privateKeyPem,
    ttlSeconds: Math.max(
      60,
      Number.parseInt(env.PHOTO_CDN_URL_TTL_SECONDS ?? '3600', 10) || 3600,
    ),
  };
}

/**
 * Build a CloudFront signed URL for an S3 object key, or null when CDN is off/misconfigured.
 * `storageKey` is the path relative to the distribution origin (same as PhotoStorage key).
 */
export function buildSignedCdnUrl(
  storageKey: string,
  cfg: CdnUrlConfig = loadCdnUrlConfig(),
): string | null {
  if (!cfg.enabled) return null;
  if (!cfg.distributionDomain || !cfg.keyPairId || !cfg.privateKeyPem) {
    return null;
  }
  const domain = cfg.distributionDomain
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  const path = storageKey.startsWith('/') ? storageKey : `/${storageKey}`;
  const resource = `https://${domain}${path}`;
  const expires = Math.floor(Date.now() / 1000) + cfg.ttlSeconds;
  const policy = JSON.stringify({
    Statement: [
      {
        Resource: resource,
        Condition: {
          DateLessThan: { 'AWS:EpochTime': expires },
        },
      },
    ],
  });
  const sign = createSign('RSA-SHA1');
  sign.update(policy);
  const signature = sign
    .sign(cfg.privateKeyPem, 'base64')
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');
  // Manual query string — URLSearchParams percent-encodes `~` as %7E which breaks CloudFront.
  return (
    `${resource}?Expires=${expires}` +
    `&Signature=${signature}` +
    `&Key-Pair-Id=${encodeURIComponent(cfg.keyPairId)}`
  );
}

/**
 * Prefer signed CDN URL when enabled; otherwise keep the relative auth file path.
 */
export function resolveMatchPrimaryPhotoUrl(opts: {
  profileId: string;
  photoId: string | null;
  storageKey?: string | null;
}): string | null {
  if (!opts.photoId) return null;
  if (opts.storageKey) {
    const signed = buildSignedCdnUrl(opts.storageKey);
    if (signed) return signed;
  }
  return `/api/v1/me/matches/${opts.profileId}/photos/${opts.photoId}/file`;
}
