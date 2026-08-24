'use client';

import { useCallback, useState } from 'react';
import { useSendConversationMessage } from '@/hooks/use-conversation-message-send-mutation';
import { SEND_COOLDOWN_MS } from '@/lib/messaging/conversation-message-limits';
import {
  ContentModerationApiError,
  MessagingMutedError,
  type ContentModerationDetails,
} from '@/lib/moderation/content-moderation-error';

export type UseConversationMessageSendResult = {
  sendMessage: (content: string) => Promise<void>;
  sending: boolean;
  sendError: string | null;
  sendModerationDetails: ContentModerationDetails | null;
  clearSendError: () => void;
};

export function useConversationMessageSend(
  conversationId: string,
): UseConversationMessageSendResult {
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendModerationDetails, setSendModerationDetails] =
    useState<ContentModerationDetails | null>(null);

  const sendMutation = useSendConversationMessage(conversationId);
  const sending = sendMutation.isPending;

  const clearSendError = useCallback(() => {
    setSendError(null);
    setSendModerationDetails(null);
  }, []);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim()) return;
      setSendError(null);
      setSendModerationDetails(null);
      try {
        await sendMutation.mutateAsync(content);
        await new Promise((r) => setTimeout(r, SEND_COOLDOWN_MS));
      } catch (e: unknown) {
        if (e instanceof ContentModerationApiError) {
          setSendModerationDetails(e.details);
          setSendError(null);
        } else if (e instanceof MessagingMutedError) {
          setSendError(e.message);
          setSendModerationDetails(null);
        } else {
          setSendError(
            e instanceof Error ? e.message : 'Failed to send message',
          );
          setSendModerationDetails(null);
        }
        throw e;
      }
    },
    [conversationId, sendMutation],
  );

  return {
    sendMessage,
    sending,
    sendError,
    sendModerationDetails,
    clearSendError,
  };
}
