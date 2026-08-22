'use client';

import { useState, useCallback, useRef } from 'react';
import {
  useLikeMatch,
  usePassMatch,
  useBlockMatch,
  useUndoMatchAction,
} from '@/hooks/use-matches';

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
  const [currentAction, setCurrentAction] = useState<YourAction>(initialAction);
  const [pendingLocal, setPendingLocal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<LastActionRecord | null>(null);

  const previousActionRef = useRef<YourAction>(null);
  const actionInFlightRef = useRef(false);

  const likeMutation = useLikeMatch({ onMutualMatch });
  const passMutation = usePassMatch();
  const blockMutation = useBlockMatch();
  const undoMutation = useUndoMatchAction();

  const actionLoading =
    pendingLocal ||
    likeMutation.isPending ||
    passMutation.isPending ||
    blockMutation.isPending ||
    undoMutation.isPending;

  const recordAction = useCallback(
    async (action: ActionType, errorMessage: string): Promise<void> => {
      if (actionInFlightRef.current || currentAction != null) return;

      setError(null);
      setPendingLocal(true);
      actionInFlightRef.current = true;
      previousActionRef.current = currentAction;

      try {
        if (action === 'LIKE') {
          await likeMutation.mutateAsync(matchId);
          setCurrentAction('LIKE');
          setLastAction({ type: 'LIKE', timestamp: Date.now() });
        } else if (action === 'PASS') {
          const { actionState } = await passMutation.mutateAsync(matchId);
          setCurrentAction(actionState.action);
          setLastAction({ type: 'PASS', timestamp: Date.now() });
        } else {
          await blockMutation.mutateAsync(matchId);
          setCurrentAction('BLOCK');
          setLastAction({ type: 'BLOCK', timestamp: Date.now() });
        }

        onActionSuccess?.(action);
      } catch (e: unknown) {
        setCurrentAction(previousActionRef.current);
        setError(e instanceof Error ? e.message : errorMessage);
      } finally {
        setPendingLocal(false);
        actionInFlightRef.current = false;
      }
    },
    [
      matchId,
      currentAction,
      likeMutation,
      passMutation,
      blockMutation,
      onActionSuccess,
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
    if (actionInFlightRef.current || currentAction == null || currentAction === 'BLOCK') {
      return;
    }

    setError(null);
    setPendingLocal(true);
    actionInFlightRef.current = true;
    previousActionRef.current = currentAction;

    try {
      const actionState = await undoMutation.mutateAsync(matchId);
      setCurrentAction(actionState.action);
      setLastAction(null);
    } catch (e: unknown) {
      setCurrentAction(previousActionRef.current);
      setError(e instanceof Error ? e.message : 'Could not undo action.');
    } finally {
      setPendingLocal(false);
      actionInFlightRef.current = false;
    }
  }, [matchId, currentAction, undoMutation]);

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
