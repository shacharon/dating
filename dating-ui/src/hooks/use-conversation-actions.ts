import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { unmatchMyConversation } from '@/lib/conversations-api';

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
  const [unmatching, setUnmatching] = useState(false);
  const [unmatchError, setUnmatchError] = useState<string | null>(null);

  const unmatch = useCallback(async () => {
    if (!conversationId || unmatching) return;
    setUnmatchError(null);
    setUnmatching(true);
    try {
      await unmatchMyConversation(conversationId);
      router.push('/dating/conversations');
    } catch (e: unknown) {
      setUnmatchError(
        e instanceof Error ? e.message : 'Failed to unmatch',
      );
      throw e;
    } finally {
      setUnmatching(false);
    }
  }, [conversationId, unmatching, router]);

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
