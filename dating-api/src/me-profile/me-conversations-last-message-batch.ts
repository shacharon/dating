export {
  batchLastMessagesByConversationId,
  LAST_MESSAGE_BATCH_SIZE,
} from './repositories/prisma-conversation.repository';
export type { LastMessageRow as LastMessageBatchRow } from './repositories/conversation.repository.types';
