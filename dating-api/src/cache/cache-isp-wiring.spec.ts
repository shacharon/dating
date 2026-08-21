import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 61 Story 1 — product injectors must depend on ISP ports, not the fat
 * RedisCacheService class. createClient for cache lives only in the connection provider.
 */
describe('cache ISP wiring (sprint-61 story 1)', () => {
  const srcRoot = path.join(__dirname, '..');

  const consumers: { rel: string; token: string }[] = [
    {
      rel: path.join('me-profile', 'matches', 'match-list-cache.service.ts'),
      token: 'CACHE_KV',
    },
    {
      rel: path.join(
        'messaging-realtime',
        'messaging-socket-registry.service.ts',
      ),
      token: 'CACHE_SETS',
    },
    {
      rel: path.join('notifications', 'message-email-debounce.service.ts'),
      token: 'CACHE_KV',
    },
    { rel: path.join('workers', 'photo-sla.cron.ts'), token: 'CRON_LOCK' },
    { rel: path.join('workers', 'mute-expiry.cron.ts'), token: 'CRON_LOCK' },
  ];

  it('five consumers inject port tokens and do not import RedisCacheService', () => {
    for (const { rel, token } of consumers) {
      const src = fs.readFileSync(path.join(srcRoot, rel), 'utf8');
      expect(src).toContain(token);
      expect(
        src.includes("from '../cache/cache.ports'") ||
          src.includes("from '../../cache/cache.ports'"),
      ).toBe(true);
      expect(src).not.toMatch(/from ['"].*redis-cache\.service['"]/);
      expect(src).not.toContain('RedisCacheService');
    }
  });

  it('createClient under src/cache only appears in redis-connection.provider.ts', () => {
    const cacheDir = path.join(__dirname);
    const files = fs
      .readdirSync(cacheDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
    const withCreateClient = files.filter((f) => {
      const text = fs.readFileSync(path.join(cacheDir, f), 'utf8');
      return /\bcreateClient\b/.test(text);
    });
    expect(withCreateClient).toEqual(['redis-connection.provider.ts']);
  });
});
