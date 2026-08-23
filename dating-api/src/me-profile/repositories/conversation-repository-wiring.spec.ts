import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 62 Story 2 — conversation/messages services inject CONVERSATION_REPOSITORY;
 * batch SQL and message create live in the Prisma adapter; side-effect ports stay on services.
 */
describe('conversation repository wiring (sprint-62 story 2)', () => {
  const meProfileRoot = path.join(__dirname, '..');

  const repoCollaborators = [
    path.join(meProfileRoot, 'conversations', 'conversation-list.service.ts'),
    path.join(
      meProfileRoot,
      'conversations',
      'conversation-read-state.service.ts',
    ),
    path.join(
      meProfileRoot,
      'conversations',
      'conversation-lifecycle.service.ts',
    ),
  ];

  const successServices = [
    path.join(meProfileRoot, 'conversations', 'me-conversation-messages.service.ts'),
    ...repoCollaborators,
  ];

  it('Success services inject CONVERSATION_REPOSITORY and not PrismaService', () => {
    for (const file of successServices) {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toContain('CONVERSATION_REPOSITORY');
      expect(src).toContain('@Inject(CONVERSATION_REPOSITORY)');
      expect(src).not.toMatch(/from ['"].*prisma\/prisma\.service['"]/);
      expect(src).not.toMatch(/PrismaService/);
    }
  });

  it('MeProfileModule registers CONVERSATION_REPOSITORY via PrismaConversationRepository', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-profile.module.ts'),
      'utf8',
    );
    expect(src).toContain('CONVERSATION_REPOSITORY');
    expect(src).toContain('PrismaConversationRepository');
    expect(src).toContain('useClass: PrismaConversationRepository');
  });

  it('messages service keeps CONTENT_MODERATION and rate-limit; create goes through repo', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'conversations', 'me-conversation-messages.service.ts'),
      'utf8',
    );
    expect(src).toContain('CONTENT_MODERATION');
    expect(src).toContain('consumeSendSlot');
    expect(src).toContain('createSentMessage');
    expect(src).toMatch(/consumeSendSlot[\s\S]*createSentMessage/);
  });

  it('assertActiveConversationParticipant stays on MeConversationsService facade', () => {
    const facadeSrc = fs.readFileSync(
      path.join(meProfileRoot, 'conversations', 'me-conversations.service.ts'),
      'utf8',
    );
    expect(facadeSrc).toContain('assertActiveConversationParticipant');
    expect(facadeSrc).toContain('lifecycleService.assertActiveConversationParticipant');
    expect(facadeSrc).not.toContain('CONVERSATION_REPOSITORY');

    const lifecycleSrc = fs.readFileSync(
      path.join(meProfileRoot, 'conversations', 'conversation-lifecycle.service.ts'),
      'utf8',
    );
    expect(lifecycleSrc).toContain('findMatchById');
    expect(lifecycleSrc).toContain('ConversationNotFoundError');
    expect(lifecycleSrc).toContain('ConversationForbiddenError');
  });

  it('adapter owns batch helpers, chunk sizes, and $queryRaw (no re-export shims)', () => {
    const unreadShim = path.join(
      meProfileRoot,
      'conversations',
      'me-conversations-unread-batch.ts',
    );
    const lastShim = path.join(
      meProfileRoot,
      'conversations',
      'me-conversations-last-message-batch.ts',
    );
    expect(fs.existsSync(unreadShim)).toBe(false);
    expect(fs.existsSync(lastShim)).toBe(false);

    const adapter = fs.readFileSync(
      path.join(meProfileRoot, 'repositories', 'prisma-conversation.repository.ts'),
      'utf8',
    );
    expect(adapter).toContain('export async function batchUnreadCountsByConversationId');
    expect(adapter).toContain('export async function batchLastMessagesByConversationId');
    expect(adapter).toContain('UNREAD_COUNT_BATCH_SIZE = 200');
    expect(adapter).toContain('LAST_MESSAGE_BATCH_SIZE = 50');
    expect(adapter).toContain('$queryRaw');
    expect(adapter).toContain('createSentMessage');
    expect(adapter).toContain('markUnmatched');
  });
});
