'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { MeMatchItemDto } from '@/lib/api/me-matches-api';
import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';
import { emitProductLog } from '@/lib/observability/product-logger';
import { MatchBrowseCard } from './match-browse-card';
import {
  groupMatchesByPriority,
  type MatchPriorityTier,
} from './match-priority';

type Props = {
  matches: MeMatchItemDto[];
  locale: AppLocale;
  listCopy: AppCopySchema['matches']['list'];
  detailCopy: AppCopySchema['matches']['detail'];
  onMutualMatch: (matchId: string, conversationId: string) => void;
  /** Render hard-blocked rows after priority sections. */
  renderBlocked: (blocked: MeMatchItemDto[]) => ReactNode;
};

function emitSectionEvent(
  event: 'match.priority_section_viewed' | 'match.priority_section_expanded',
  tier: MatchPriorityTier,
): void {
  emitProductLog({
    level: 'trace',
    route: '/dating/me-matches',
    message: event,
    meta: { event, tier },
  });
}

function useSectionViewed(tier: MatchPriorityTier, enabled: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const seen = useRef(false);

  useEffect(() => {
    seen.current = false;
  }, [tier, enabled]);

  useEffect(() => {
    const node = ref.current;
    if (!enabled || !node || typeof IntersectionObserver === 'undefined') {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || seen.current) return;
        seen.current = true;
        emitSectionEvent('match.priority_section_viewed', tier);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [tier, enabled]);

  return ref;
}

function CollapsibleSection({
  tier,
  title,
  countLabel,
  count,
  open,
  onOpenChange,
  children,
}: {
  tier: 'GOOD' | 'OTHER';
  title: string;
  countLabel: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const sectionRef = useSectionViewed(tier, count > 0);
  const panelId = `match-priority-${tier.toLowerCase()}`;

  return (
    <section
      ref={sectionRef}
      data-testid={`match-priority-section-${tier.toLowerCase()}`}
      className="space-y-3"
    >
      <button
        type="button"
        data-testid={`match-priority-toggle-${tier.toLowerCase()}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          const next = !open;
          onOpenChange(next);
          if (next) {
            emitSectionEvent('match.priority_section_expanded', tier);
          }
        }}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-offset-zinc-950"
      >
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {title}{' '}
          <span className="font-medium text-zinc-500 dark:text-zinc-400">
            {countLabel}
          </span>
        </span>
        <span className="text-zinc-400" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>
      <div id={panelId} hidden={!open} data-testid={`match-priority-panel-${tier.toLowerCase()}`}>
        {open ? children : null}
      </div>
    </section>
  );
}

/**
 * Priority triage sections over photo-first browse cards.
 */
export function MatchPrioritySections({
  matches,
  locale,
  listCopy,
  detailCopy,
  onMutualMatch,
  renderBlocked,
}: Props) {
  const { high, good, other, blocked } = groupMatchesByPriority(matches);
  const [goodOpen, setGoodOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const priorityCopy = listCopy.priority;
  const highRef = useSectionViewed('HIGH', high.length > 0);

  let browseIndex = 0;

  const renderCards = (items: MeMatchItemDto[]) => (
    <ul className="flex flex-col gap-6">
      {items.map((m) => {
        const index = browseIndex++;
        return (
          <MatchBrowseCard
            key={m.id}
            match={m}
            index={index}
            locale={locale}
            listCopy={listCopy}
            detailCopy={detailCopy}
            onMutualMatch={(conversationId) =>
              onMutualMatch(m.id, conversationId)
            }
          />
        );
      })}
    </ul>
  );

  return (
    <div className="space-y-8" data-testid="match-priority-sections">
      {high.length > 0 && (
        <section
          ref={highRef}
          data-testid="match-priority-section-high"
          className="space-y-3 border-l-2 border-emerald-500 pl-4"
        >
          <header>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {priorityCopy.highTitle}{' '}
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {priorityCopy.count(high.length)}
              </span>
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {priorityCopy.highDescription}
            </p>
          </header>
          {renderCards(high)}
        </section>
      )}

      {good.length > 0 && (
        <CollapsibleSection
          tier="GOOD"
          title={priorityCopy.goodTitle}
          countLabel={priorityCopy.count(good.length)}
          count={good.length}
          open={goodOpen}
          onOpenChange={setGoodOpen}
        >
          {renderCards(good)}
        </CollapsibleSection>
      )}

      {other.length > 0 && (
        <CollapsibleSection
          tier="OTHER"
          title={priorityCopy.otherTitle}
          countLabel={priorityCopy.count(other.length)}
          count={other.length}
          open={otherOpen}
          onOpenChange={setOtherOpen}
        >
          {renderCards(other)}
        </CollapsibleSection>
      )}

      {blocked.length > 0 ? (
        <div data-testid="match-priority-blocked-trailer">
          <ul className="flex flex-col gap-3">{renderBlocked(blocked)}</ul>
        </div>
      ) : null}
    </div>
  );
}
