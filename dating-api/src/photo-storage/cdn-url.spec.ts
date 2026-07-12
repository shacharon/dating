import { generateKeyPairSync } from 'node:crypto';
import { buildSignedCdnUrl, resolveMatchPrimaryPhotoUrl } from './cdn-url';

describe('cdn-url', () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

  it('returns null when CDN disabled', () => {
    expect(
      buildSignedCdnUrl('profile-photos/p1/ph1.jpg', {
        enabled: false,
        distributionDomain: 'd123.cloudfront.net',
        keyPairId: 'K123',
        privateKeyPem,
        ttlSeconds: 3600,
      }),
    ).toBeNull();
  });

  it('builds signed URL without percent-encoding CloudFront signature tildes', () => {
    const url = buildSignedCdnUrl('profile-photos/p1/ph1.jpg', {
      enabled: true,
      distributionDomain: 'https://d123.cloudfront.net/',
      keyPairId: 'KPAIR',
      privateKeyPem,
      ttlSeconds: 3600,
    });
    expect(url).toMatch(/^https:\/\/d123\.cloudfront\.net\/profile-photos\/p1\/ph1\.jpg\?/);
    expect(url).toContain('Key-Pair-Id=KPAIR');
    expect(url).toContain('Signature=');
    expect(url).not.toContain('%7E');
  });

  it('resolveMatchPrimaryPhotoUrl falls back to auth file path', () => {
    expect(
      resolveMatchPrimaryPhotoUrl({
        profileId: 'prof1',
        photoId: 'ph1',
        storageKey: null,
      }),
    ).toBe('/api/v1/me/matches/prof1/photos/ph1/file');
  });
});
