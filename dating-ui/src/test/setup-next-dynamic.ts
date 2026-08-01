import React from 'react';
import { vi } from 'vitest';

/**
 * Resolve `next/dynamic` without React.lazy/Suspense (those fight Vitest fake timers).
 * Loader runs in useLayoutEffect; specs that assert overlays should `waitFor` content.
 */
vi.mock('next/dynamic', () => ({
  default: (
    loader: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
  ) => {
    function DynamicTest(props: Record<string, unknown>) {
      const [Comp, setComp] = React.useState<React.ComponentType<
        Record<string, unknown>
      > | null>(null);

      React.useLayoutEffect(() => {
        let cancelled = false;
        void loader().then((mod) => {
          if (!cancelled) {
            setComp(() => mod.default);
          }
        });
        return () => {
          cancelled = true;
        };
      }, []);

      if (!Comp) return null;
      return React.createElement(Comp, props);
    }
    return DynamicTest;
  },
}));
