import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 61 Story 2 / Sprint 63 Story 4 — rate-limit services/providers must not
 * own Redis createClient; shared fixed-window lives under cache/rate-limit.
 */
describe('rate-limit store DI wiring (sprint-61/63)', () => {
  const srcRoot = path.join(__dirname, '..');
  const meProfile = path.join(srcRoot, 'me-profile');
  const messaging = path.join(srcRoot, 'messaging-realtime');
  const sharedRateLimit = path.join(__dirname, 'rate-limit');

  const serviceFiles = [
    path.join(meProfile, 'conversation-message-rate-limit.service.ts'),
    path.join(messaging, 'messaging-ws-rate-limit.service.ts'),
  ];

  const providerFiles = [
    path.join(meProfile, 'conversation-message-rate-limit-store.provider.ts'),
    path.join(messaging, 'messaging-ws-rate-limit-store.provider.ts'),
  ];

  it('rate-limit services contain no createClient / redis quit', () => {
    for (const file of serviceFiles) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).not.toMatch(/\bcreateClient\b/);
      expect(src).not.toMatch(/\.quit\s*\(/);
      expect(src).not.toMatch(/from ['"]redis['"]/);
    }
  });

  it('store providers use REDIS_CLIENT and never createClient/quit', () => {
    for (const file of providerFiles) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('REDIS_CLIENT');
      expect(src).toContain('OnModuleInit');
      expect(src).not.toMatch(/\bcreateClient\b/);
      expect(src).not.toMatch(/\.quit\s*\(/);
      expect(src).not.toMatch(/from ['"]redis['"]/);
    }
  });

  it('shared cache/rate-limit stores exist and redis store has no createClient', () => {
    expect(
      fs.existsSync(
        path.join(sharedRateLimit, 'memory-fixed-window-rate-limit.store.ts'),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(sharedRateLimit, 'redis-fixed-window-rate-limit.store.ts'),
      ),
    ).toBe(true);
    const redisStore = fs.readFileSync(
      path.join(sharedRateLimit, 'redis-fixed-window-rate-limit.store.ts'),
      'utf8',
    );
    expect(redisStore).not.toMatch(/\bcreateClient\b/);
    expect(redisStore).not.toMatch(/\.quit\s*\(/);
  });

  it('modules register store tokens with useExisting', () => {
    const meProfileMod = fs.readFileSync(
      path.join(meProfile, 'me-profile.module.ts'),
      'utf8',
    );
    const messagingMod = fs.readFileSync(
      path.join(messaging, 'messaging-realtime.module.ts'),
      'utf8',
    );
    expect(meProfileMod).toContain('MESSAGE_RATE_LIMIT_STORE');
    expect(meProfileMod).toContain('MessageRateLimitStoreProvider');
    expect(meProfileMod).toContain('useExisting: MessageRateLimitStoreProvider');
    expect(messagingMod).toContain('WS_RATE_LIMIT_STORE');
    expect(messagingMod).toContain('WsRateLimitStoreProvider');
    expect(messagingMod).toContain('useExisting: WsRateLimitStoreProvider');
  });
});
