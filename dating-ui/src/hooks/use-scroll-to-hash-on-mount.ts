'use client';

import { useEffect } from 'react';

/** Scroll to `window.location.hash` element after mount / hash change. */
export function useScrollToHashOnMount(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const scroll = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    scroll();
    window.addEventListener('hashchange', scroll);
    return () => window.removeEventListener('hashchange', scroll);
  }, [enabled]);
}
