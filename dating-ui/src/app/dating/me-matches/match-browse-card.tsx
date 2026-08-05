'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MatchPhoto } from '@/components/match-photo';
import type { MeMatchItemDto } from '@/lib/me-matches-api';
import type { AppCopySchema, AppLocale } from '@/lib/i18n/types';
import { emitProductLog } from '@/lib/observability/product-logger';
import {
  formatBrowseAge,
  matchBrowseLocation,
  matchBrowseOneLiner,
  matchListPrimaryLabel,
} from './match-display';
import { MatchBrowseActions } from './match-browse-actions';
import { MatchWhySection } from './match-why-section';
import { markMatchesScrollForRestore } from './me-matches-scroll';

export type MatchBrowseCardProps = {
  match: MeMatchItemDto;
  index: number;
  locale: AppLocale;
  listCopy: AppCopySchema['matches']['list'];
  detailCopy: AppCopySchema['matches']['detail'];
  onMutualMatch: (conversationId: string) => void;
};

function emitCardViewed(
  matchProfileId: string,
  explanation_expanded: boolean,
): void {
  emitProductLog({
    level: 'trace',
    route: '/dating/me-matches',
    message: 'match.card_viewed',
    meta: {
      event: 'match.card_viewed',
      matchProfileId,
      explanation_expanded,
    },
  });
}

/**
 * Photo-first match browse card (eligible matches only).
 */
export function MatchBrowseCard({
  match: m,
  index,
  locale: _locale,
  listCopy,
  detailCopy,
  onMutualMatch,
}: MatchBrowseCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);
  const viewedRef = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const displayName = matchListPrimaryLabel(m);
  const age = formatBrowseAge(m.ageYears);
  const location = matchBrowseLocation(m);
  const oneLiner = matchBrowseOneLiner(m);
  const showAgeBesideName = Boolean(m.nickname?.trim() && age);

  useEffect(() => {
    const node = cardRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting || viewedRef.current) return;
        viewedRef.current = true;
        emitCardViewed(m.id, false);
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [m.id]);

  const handleWhyOpenChange = (open: boolean) => {
    setWhyOpen(open);
    if (open) {
      emitCardViewed(m.id, true);
    }
  };

  return (
    <li>
      <article
        ref={cardRef}
        data-testid="match-browse-card"
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div
          data-testid="match-browse-photo-region"
          className={
            whyOpen
              ? 'relative h-[40vh] max-h-[640px] w-full overflow-hidden transition-[height] duration-200'
              : 'relative h-[70vh] max-h-[640px] w-full overflow-hidden transition-[height] duration-200'
          }
        >
          <MatchPhoto
            variant="browse"
            photoUrl={m.primaryPhotoUrl ?? null}
            displayName={displayName}
            priority={index < 3}
            testId="match-browse-photo"
            className="!h-full !w-full"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent px-5 pb-5 pt-16">
            <Link
              href={`/dating/me-matches/${m.id}`}
              scroll={false}
              onClick={() => markMatchesScrollForRestore()}
              className="pointer-events-auto text-xl font-semibold tracking-tight text-white outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-white/80"
              data-testid="match-browse-name"
            >
              {displayName}
              {showAgeBesideName ? (
                <span className="font-medium text-white/90">, {age}</span>
              ) : null}
            </Link>
            {location ? (
              <p
                className="mt-1 text-sm text-white/85"
                data-testid="match-browse-location"
              >
                {location}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          {oneLiner ? (
            <p
              className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300"
              data-testid="match-browse-oneliner"
            >
              {oneLiner}
            </p>
          ) : null}

          <MatchWhySection
            match={m}
            open={whyOpen}
            onOpenChange={handleWhyOpenChange}
            listCopy={listCopy}
          />

          <MatchBrowseActions
            matchId={m.id}
            initialAction={m.yourAction}
            detailCopy={detailCopy}
            disabled={false}
            onMutualMatch={onMutualMatch}
          />

          <Link
            href={`/dating/me-matches/${m.id}`}
            scroll={false}
            onClick={() => markMatchesScrollForRestore()}
            className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline dark:text-zinc-400 dark:hover:text-zinc-200"
            data-testid="match-browse-view-profile"
          >
            {listCopy.browse.viewProfile}
          </Link>
        </div>
      </article>
    </li>
  );
}
