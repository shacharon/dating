import { useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  likeMatch,
  passMatch,
  blockMatch,
  undoMatchAction,
  fetchMatchAction,
  type MatchActionDto,
} from '@/lib/me-matches-api';
import { queryKeys } from '@/lib/query-keys';

type ActionType = 'LIKE' | 'PASS' | 'BLOCK';
type YourAction = ActionType | null;

interface LastActionRecord {
  type: ActionType;
  timestamp: number;
}

interface UseMatchActionsOptions {
  matchId: string;
  initialAction?: YourAction;
  onMutualMatch?: (conversationId: string) => void;
  onActionSuccess?: (action: ActionType) => void;
}

interface UseMatchActionsReturn {
  like: () => Promise<void>;
  pass: () => Promise<void>;
  block: () => Promise<void>;
  undo: () => Promise<void>;
  actionLoading: boolean;
  currentAction: YourAction;
  setCurrentAction: (action: YourAction) => void;
  canUndo: boolean;
  lastAction: LastActionRecord | null;
  error: string | null;
}

export function useMatchActions({
  matchId,
  initialAction = null,
  onMutualMatch,
  onActionSuccess,
}: UseMatchActionsOptions): UseMatchActionsReturn {
  const queryClient = useQueryClient();
  const [currentAction, setCurrentAction] = useState<YourAction>(initialAction);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastActionRecord | null>(null);

  const previousActionRef = useRef<YourAction>(null);

  const invalidateMatchesList = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.me.matches.list,
    });
  }, [queryClient]);

  const recordAction = useCallback(
    async (action: ActionType, errorMessage: string): Promise<void> => {
      if (actionLoading || currentAction != null) return;

      setError(null);
      setActionLoading(true);
      previousActionRef.current = currentAction;

      try {
        let result: MatchActionDto;
        if (action === 'LIKE') {
          result = await likeMatch(matchId);
          setCurrentAction('LIKE');
          setLastAction({ type: 'LIKE', timestamp: Date.now() });

          if (result.mutualMatch && result.conversationId) {
            onMutualMatch?.(result.conversationId);
          }
        } else if (action === 'PASS') {
          result = await passMatch(matchId);
          const actionState = await fetchMatchAction(matchId);
          setCurrentAction(actionState.action);
          setLastAction({ type: 'PASS', timestamp: Date.now() });
        } else {
          result = await blockMatch(matchId);
          setCurrentAction('BLOCK');
          setLastAction({ type: 'BLOCK', timestamp: Date.now() });
        }

        await invalidateMatchesList();
        onActionSuccess?.(action);
      } catch (e: unknown) {
        setCurrentAction(previousActionRef.current);
        setError(e instanceof Error ? e.message : errorMessage);
      } finally {
        setActionLoading(false);
      }
    },
    [
      matchId,
      actionLoading,
      currentAction,
      onMutualMatch,
      onActionSuccess,
      invalidateMatchesList,
    ],
  );

  const like = useCallback(async () => {
    await recordAction('LIKE', 'Could not like this match.');
  }, [recordAction]);

  const pass = useCallback(async () => {
    await recordAction('PASS', 'Could not pass on this match.');
  }, [recordAction]);

  const block = useCallback(async () => {
    await recordAction('BLOCK', 'Could not block this match.');
  }, [recordAction]);

  const undo = useCallback(async () => {
    if (actionLoading || currentAction == null || currentAction === 'BLOCK') {
      return;
    }

    setError(null);
    setActionLoading(true);
    previousActionRef.current = currentAction;

    try {
      await undoMatchAction(matchId);
      const actionState = await fetchMatchAction(matchId);
      setCurrentAction(actionState.action);
      setLastAction(null);
      await invalidateMatchesList();
    } catch (e: unknown) {
      setCurrentAction(previousActionRef.current);
      setError(e instanceof Error ? e.message : 'Could not undo action.');
    } finally {
      setActionLoading(false);
    }
  }, [matchId, actionLoading, currentAction, invalidateMatchesList]);

  const canUndo =
    currentAction != null &&
    currentAction !== 'BLOCK' &&
    !actionLoading;

  return {
    like,
    pass,
    block,
    undo,
    actionLoading,
    currentAction,
    setCurrentAction,
    canUndo,
    lastAction,
    error,
  };
}
