'use client';

import Link from 'next/link';
import type { MeMatchItemDto } from '@/lib/me-matches-api';
import type { AppCopySchema } from '@/lib/i18n/types';
import { matchBrowseWhyBody } from './match-display';
import { markMatchesScrollForRestore } from './me-matches-scroll';
import { chipToEvidence } from './chip-evidence';

export type MatchWhySectionProps = {
  match: MeMatchItemDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listCopy: AppCopySchema['matches']['list'];
  /** Override collapsed Why toggle label (e.g. Mode B expand copy). */
  whyToggle?: string;
};

/**
 * Collapsed-by-default “why we matched” using list DTO fields only.
 */
export function MatchWhySection({
  match,
  open,
  onOpenChange,
  listCopy,
  whyToggle: whyToggleOverride,
}: MatchWhySectionProps) {
  const browse = listCopy.browse;
  const body = matchBrowseWhyBody(match);
  const chips = match.explainability?.positiveChips?.filter(Boolean) ?? [];
  const tension = match.explainability?.tensionChip?.trim();
  const score = match.matchScore;
  const toggleLabel =
    whyToggleOverride ??
    (score != null ? browse.whyToggleWithScore(score) : browse.whyToggle);

  return (
    <div data-testid="match-why-section">
      <button
        type="button"
        data-testid="match-why-toggle"
        aria-expanded={open}
        aria-controls={`match-why-panel-${match.id}`}
        onClick={() => onOpenChange(!open)}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg px-1 py-2 text-start text-sm font-medium text-zinc-700 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-zinc-400 dark:text-zinc-200 dark:ring-offset-zinc-900"
      >
        <span>{open ? browse.whyHeading : toggleLabel}</span>
        <span className="text-zinc-400" aria-hidden>
          {open ? '▴' : '▾'}
        </span>
      </button>

      <div
        id={`match-why-panel-${match.id}`}
        data-testid="match-why-panel"
        hidden={!open}
        className="space-y-3 pb-1 pt-1"
      >
        {open ? (
          <>
            {body ? (
              <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                {body}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {browse.whyEmpty}
              </p>
            )}
            {(chips.length > 0 || tension) && (
              <ul className="flex flex-wrap gap-2" data-testid="match-why-chips">
                {chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  >
                    {chipToEvidence(chip, browse.chipEvidence)}
                  </li>
                ))}
                {tension ? (
                  <li className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    {tension}
                  </li>
                ) : null}
              </ul>
            )}
            <Link
              href={`/dating/me-matches/${match.id}`}
              scroll={false}
              onClick={() => markMatchesScrollForRestore()}
              className="inline-flex min-h-11 items-center text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-zinc-100"
              data-testid="match-why-view-profile"
            >
              {browse.viewProfile}
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}
