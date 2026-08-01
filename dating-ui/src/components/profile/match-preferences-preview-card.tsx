import Link from 'next/link';
import type { PrefPreviewLine } from '@/components/profile/match-preferences-preview-display';

type Props = {
  heading: string;
  title: string;
  lines: PrefPreviewLine[];
  emptyBody: string;
  ctaLabel: string;
  status?: 'loading' | 'error' | 'ready';
  statusText?: string;
};

/** Presentational match-preferences summary + CTA for the profile Settings tab. */
export function MatchPreferencesPreviewCard({
  heading,
  title,
  lines,
  emptyBody,
  ctaLabel,
  status = 'ready',
  statusText,
}: Props) {
  return (
    <section id="match-prefs" className="scroll-mt-24 space-y-3">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {heading}
      </h2>
      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {title}
        </p>
        {status === 'loading' || status === 'error' ? (
          <p
            className="mt-3 text-sm text-zinc-600 dark:text-zinc-400"
            role="status"
          >
            {statusText}
          </p>
        ) : lines.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1.5 ps-5 text-sm text-zinc-700 dark:text-zinc-300">
            {lines.map((line) => (
              <li key={line.key}>{line.text}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            {emptyBody}
          </p>
        )}
        <div className="mt-4">
          <Link
            href="/settings/preferences"
            data-testid="profile-match-preferences-link"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
