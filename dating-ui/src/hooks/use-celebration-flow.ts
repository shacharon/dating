import { useState, useEffect, useCallback, useRef } from 'react';

interface UseCelebrationFlowOptions {
  autoHideDuration?: number;
}

interface UseCelebrationFlowReturn {
  showCelebration: boolean;
  triggerCelebration: (conversationId: string) => void;
  dismissCelebration: () => void;
  celebrationData: { conversationId: string } | null;
}

export function useCelebrationFlow({
  autoHideDuration = 5000,
}: UseCelebrationFlowOptions = {}): UseCelebrationFlowReturn {
  const [celebrationData, setCelebrationData] = useState<{
    conversationId: string;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerCelebration = useCallback(
    (conversationId: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      setCelebrationData({ conversationId });

      timerRef.current = setTimeout(() => {
        setCelebrationData(null);
        timerRef.current = null;
      }, autoHideDuration);
    },
    [autoHideDuration],
  );

  const dismissCelebration = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setCelebrationData(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    showCelebration: celebrationData != null,
    triggerCelebration,
    dismissCelebration,
    celebrationData,
  };
}
