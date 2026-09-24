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
    /** Retry once for late-mounted section content (settings cards, edit panes). */
    const retry = window.setTimeout(scroll, 120);
    window.addEventListener('hashchange', scroll);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener('hashchange', scroll);
    };
  }, [enabled]);
}
