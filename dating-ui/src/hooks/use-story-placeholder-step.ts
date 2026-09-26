'use client';

import { useEffect, useState } from 'react';

const DEFAULT_INTERVAL_MS = 4500;

export function useStoryPlaceholderStep(intervalMs = DEFAULT_INTERVAL_MS): number {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (media?.matches) return;
    const id = window.setInterval(() => {
      setStep((current) => current + 1);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return step;
}
