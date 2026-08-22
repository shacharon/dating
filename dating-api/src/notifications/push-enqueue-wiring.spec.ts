import * as fs from 'fs';
import * as path from 'path';

describe('push enqueue wiring (static)', () => {
  const root = path.join(__dirname, '..');

  it('does not enqueue push from prisma-match.repository', () => {
    const file = path.join(
      root,
      'me-profile',
      'repositories',
      'prisma-match.repository.ts',
    );
    const src = fs.readFileSync(file, 'utf8');
    expect(src).not.toMatch(/PUSH_NOTIFICATION|pushQueue|enqueueMutualMatch/);
  });

  it('enqueues from message and match action services', () => {
    const messages = fs.readFileSync(
      path.join(root, 'me-profile', 'me-conversation-messages.service.ts'),
      'utf8',
    );
    const actions = fs.readFileSync(
      path.join(root, 'me-profile', 'me-match-actions.service.ts'),
      'utf8',
    );
    expect(messages).toContain('enqueueNewMessageBestEffort');
    expect(actions).toContain('enqueueMutualMatchBestEffort');
  });
});
