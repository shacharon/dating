import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 61 Story 2 — rate-limit services/providers must not own Redis createClient.
 */
describe('rate-limit store DI wiring (sprint-61 story 2)', () => {
  const roots = [
    path.join(__dirname, '..', 'me-profile'),
    path.join(__dirname, '..', 'messaging-realtime'),
  ];

  const serviceFiles = [
    path.join(
      roots[0],
      'conversation-message-rate-limit.service.ts',
    ),
    path.join(roots[1], 'messaging-ws-rate-limit.service.ts'),
  ];

  const providerFiles = [
    path.join(
      roots[0],
      'conversation-message-rate-limit-store.provider.ts',
    ),
    path.join(roots[1], 'messaging-ws-rate-limit-store.provider.ts'),
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

  it('modules register store tokens with useExisting', () => {
    const meProfile = fs.readFileSync(
      path.join(roots[0], 'me-profile.module.ts'),
      'utf8',
    );
    const messaging = fs.readFileSync(
      path.join(roots[1], 'messaging-realtime.module.ts'),
      'utf8',
    );
    expect(meProfile).toContain('MESSAGE_RATE_LIMIT_STORE');
    expect(meProfile).toContain('MessageRateLimitStoreProvider');
    expect(meProfile).toContain('useExisting: MessageRateLimitStoreProvider');
    expect(messaging).toContain('WS_RATE_LIMIT_STORE');
    expect(messaging).toContain('WsRateLimitStoreProvider');
    expect(messaging).toContain('useExisting: WsRateLimitStoreProvider');
  });
});
