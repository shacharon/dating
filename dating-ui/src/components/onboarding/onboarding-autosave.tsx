'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

type Flush = () => Promise<void>;

const OnboardingAutosaveContext = createContext<{
  register: (flush: Flush) => () => void;
  flush: () => Promise<void>;
} | null>(null);

export function OnboardingAutosaveProvider({ children }: { children: ReactNode }) {
  const flushRef = useRef<Flush | null>(null);

  const register = useCallback((flush: Flush) => {
    flushRef.current = flush;
    return () => {
      if (flushRef.current === flush) flushRef.current = null;
    };
  }, []);

  const flush = useCallback(async () => {
    await flushRef.current?.();
  }, []);

  return (
    <OnboardingAutosaveContext.Provider value={{ register, flush }}>
      {children}
    </OnboardingAutosaveContext.Provider>
  );
}

export function useOnboardingAutosave() {
  return useContext(OnboardingAutosaveContext);
}
