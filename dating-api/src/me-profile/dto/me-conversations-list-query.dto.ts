import { BadRequestException } from '@nestjs/common';

export const DEFAULT_CONVERSATION_LIST_LIMIT = 20;
export const MAX_CONVERSATION_LIST_LIMIT = 50;

export function parseConversationListLimit(limitStr?: string): number {
  if (limitStr === undefined || limitStr.trim() === '') {
    return DEFAULT_CONVERSATION_LIST_LIMIT;
  }
  const parsed = Number.parseInt(limitStr, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed < 1 ||
    parsed > MAX_CONVERSATION_LIST_LIMIT
  ) {
    throw new BadRequestException(
      `Invalid conversation list limit (1–${MAX_CONVERSATION_LIST_LIMIT}).`,
    );
  }
  return parsed;
}

export type MeConversationsListQuery = {
  cursor?: string;
  limit: number;
};
