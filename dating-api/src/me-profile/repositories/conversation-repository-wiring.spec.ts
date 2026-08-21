import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Sprint 62 Story 2 — conversation/messages services inject CONVERSATION_REPOSITORY;
 * batch SQL and message create live in the Prisma adapter; side-effect ports stay on services.
 */
describe('conversation repository wiring (sprint-62 story 2)', () => {
  const meProfileRoot = path.join(__dirname, '..');

  const successServices = [
    path.join(meProfileRoot, 'me-conversations.service.ts'),
    path.join(meProfileRoot, 'me-conversation-messages.service.ts'),
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
      path.join(meProfileRoot, 'me-conversation-messages.service.ts'),
      'utf8',
    );
    expect(src).toContain('CONTENT_MODERATION');
    expect(src).toContain('consumeSendSlot');
    expect(src).toContain('createSentMessage');
    expect(src).toMatch(/consumeSendSlot[\s\S]*createSentMessage/);
  });

  it('assertActiveConversationParticipant stays on MeConversationsService', () => {
    const src = fs.readFileSync(
      path.join(meProfileRoot, 'me-conversations.service.ts'),
      'utf8',
    );
    expect(src).toContain('assertActiveConversationParticipant');
    expect(src).toContain('findMatchById');
    expect(src).toContain('ConversationNotFoundError');
    expect(src).toContain('ConversationForbiddenError');
  });

  it('batch helpers re-export adapter functions; adapter owns chunk sizes + $queryRaw', () => {
    const unread = fs.readFileSync(
      path.join(meProfileRoot, 'me-conversations-unread-batch.ts'),
      'utf8',
    );
    const last = fs.readFileSync(
      path.join(meProfileRoot, 'me-conversations-last-message-batch.ts'),
      'utf8',
    );
    const adapter = fs.readFileSync(
      path.join(meProfileRoot, 'repositories', 'prisma-conversation.repository.ts'),
      'utf8',
    );
    expect(unread).toContain('prisma-conversation.repository');
    expect(last).toContain('prisma-conversation.repository');
    expect(adapter).toContain('UNREAD_COUNT_BATCH_SIZE = 200');
    expect(adapter).toContain('LAST_MESSAGE_BATCH_SIZE = 50');
    expect(adapter).toContain('$queryRaw');
    expect(adapter).toContain('createSentMessage');
    expect(adapter).toContain('markUnmatched');
  });
});
