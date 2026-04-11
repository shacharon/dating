'use client';

import { useEffect, useMemo, useRef } from 'react';
import { getApiBase } from '@/lib/api-base';
import {
  CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK,
  CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_IMPRESSION,
  childrenUnsureAnalyticsEventsUrl,
} from '../_lib/children-unsure';

type Props = {
  readonly visible: boolean;
};

/**
 * Clickable badge + fire-and-forget analytics (impression once per mount when visible; click counts).
 */
export function ChildrenUnsureBadge({ visible }: Props) {
  const impressionSent = useRef(false);
  const apiBase = useMemo(() => getApiBase(), []);

  useEffect(() => {
    if (!visible || impressionSent.current) return;
    impressionSent.current = true;
    void fetch(`${apiBase}/api/v1/matches/analytics/children-unsure/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'badge_impression' }),
    }).catch(() => {});
  }, [visible, apiBase]);

  if (!visible) return null;

  const onClick = () => {
    void fetch(childrenUnsureAnalyticsEventsUrl(apiBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: CHILDREN_UNSURE_ANALYTICS_EVENT_BADGE_CLICK }),
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-left text-xs font-medium text-violet-900 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-100 dark:hover:bg-violet-900/50"
      data-testid="match-badge-children-unsure"
      title="One side needs a partner who wants kids; the other is unsure. Tap to acknowledge."
      onClick={onClick}
    >
      Not sure about kids
    </button>
  );
}
