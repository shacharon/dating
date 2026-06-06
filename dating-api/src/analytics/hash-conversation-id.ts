import { createHash } from 'node:crypto';

export function hashConversationId(conversationId: string): string {
  const salt = process.env.PRODUCT_ANALYTICS_HASH_SALT?.trim() ?? '';
  const input = salt ? `${salt}:${conversationId}` : conversationId;
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}
