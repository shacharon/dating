import * as fs from 'node:fs';
import * as path from 'node:path';

describe('session connection read wiring (sprint-64 story 03)', () => {
  const sessionRoot = __dirname;
  const messagingRoot = path.join(__dirname, '..', 'messaging-realtime');

  it('MessagingWsSessionService injects SESSION_CONNECTION_READ', () => {
    const src = fs.readFileSync(
      path.join(messagingRoot, 'messaging-ws-session.service.ts'),
      'utf8',
    );
    expect(src).toContain('@Inject(SESSION_CONNECTION_READ)');
    expect(src).not.toMatch(/PrismaService/);
    expect(src).not.toMatch(/prisma\/prisma\.service/);
  });

  it('SessionModule registers and exports SESSION_CONNECTION_READ', () => {
    const src = fs.readFileSync(
      path.join(sessionRoot, 'session.module.ts'),
      'utf8',
    );
    expect(src).toContain('SESSION_CONNECTION_READ');
    expect(src).toContain('useClass: PrismaSessionConnectionReadRepository');
    expect(src).toContain('exports: [SessionService, SESSION_CONNECTION_READ]');
  });

  it('MessagingRealtimeModule no longer imports PrismaModule for ws-session', () => {
    const src = fs.readFileSync(
      path.join(messagingRoot, 'messaging-realtime.module.ts'),
      'utf8',
    );
    expect(src).not.toContain('PrismaModule');
    expect(src).toContain('SessionModule');
  });
});
