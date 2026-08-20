'use client';

/**
 * Stable public path — conversation thread state machine.
 * Implementation lives in `hooks/messaging/use-conversation-thread`.
 */
export {
  useConversationThread as useConversationMessages,
  type UseConversationThreadOptions as UseConversationMessagesOptions,
  type UseConversationThreadReturn as UseConversationMessagesReturn,
} from '@/hooks/messaging/use-conversation-thread';
