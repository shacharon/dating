import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { datingApi } from '@/lib/api-sdk';
import { queryKeys } from '@/lib/query-keys';

export interface UseConversationActionsReturn {
  unmatch: () => Promise<void>;
  unmatching: boolean;
  unmatchError: string | null;
  clearUnmatchError: () => void;
}

export function useConversationActions(
  conversationId: string,
): UseConversationActionsReturn {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [unmatching, setUnmatching] = useState(false);
  const [unmatchError, setUnmatchError] = useState<string | null>(null);

  const unmatch = useCallback(async () => {
    if (!conversationId || unmatching) return;
    setUnmatchError(null);
    setUnmatching(true);
    try {
      await datingApi.conversations.unmatchMyConversation(conversationId);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.me.conversations.list,
      });
      router.push('/dating/conversations');
    } catch (e: unknown) {
      setUnmatchError(
        e instanceof Error ? e.message : 'Failed to unmatch',
      );
      throw e;
    } finally {
      setUnmatching(false);
    }
  }, [conversationId, unmatching, router, queryClient]);

  const clearUnmatchError = useCallback(() => {
    setUnmatchError(null);
  }, []);

  return {
    unmatch,
    unmatching,
    unmatchError,
    clearUnmatchError,
  };
}
