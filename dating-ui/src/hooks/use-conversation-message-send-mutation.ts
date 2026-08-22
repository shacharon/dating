'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '@/contexts/auth-context';
import { datingApi } from '@/lib/api-sdk';
import type { MessageDto } from '@/lib/api-types/conversations';
import { queryKeys } from '@/lib/query-keys';
import {
  appendMessagesInCache,
  createOptimisticMessage,
  replaceMessageInCache,
  snapshotMessagesCache,
  type ConversationMessagesCache,
} from '@/hooks/conversation-messages-cache';

export type SendMessageContext = {
  previous: ConversationMessagesCache | undefined;
  optimisticId: string;
};

export function useSendConversationMessage(
  conversationId: string,
): UseMutationResult<MessageDto, Error, string, SendMessageContext> {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (text: string) =>
      datingApi.conversations.sendConversationMessage(conversationId, text),
    onMutate: async (text) => {
      const previous = snapshotMessagesCache(queryClient, conversationId);
      const optimistic = createOptimisticMessage(
        conversationId,
        user?.id ?? '',
        text,
      );
      appendMessagesInCache(queryClient, conversationId, [optimistic]);
      return { previous, optimisticId: optimistic.id };
    },
    onError: (_err, _text, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          queryKeys.me.conversations.messages(conversationId),
          context.previous,
        );
      }
    },
    onSuccess: (serverMessage, _text, context) => {
      if (context?.optimisticId) {
        replaceMessageInCache(
          queryClient,
          conversationId,
          context.optimisticId,
          serverMessage,
        );
      }
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.conversations.list,
      });
    },
  });
}
