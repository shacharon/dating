'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { listMyProfilePhotos } from '@/lib/me-photos-api';
import {
  basicsComplete,
  storyComplete,
} from '@/lib/profile-completeness';
import { useAppLocale } from '@/lib/i18n';

export function ProfileCompletenessHints({ draft }: { draft: ProfileDraft }) {
  const { copy: appCopy } = useAppLocale();
  const [hasApprovedPhoto, setHasApprovedPhoto] = useState(false);
  const [loading, setLoading] = useState(true);

  const copy = appCopy.profileCompleteness;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyProfilePhotos();
        if (cancelled) return;
        setHasApprovedPhoto(rows.some((p) => p.status === 'APPROVED'));
      } catch {
        if (!cancelled) setHasApprovedPhoto(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(
    () => [
      { key: 'photo', label: copy.photo, done: hasApprovedPhoto },
      { key: 'basics', label: copy.basics, done: basicsComplete(draft) },
      { key: 'story', label: copy.story, done: storyComplete(draft) },
    ],
    [copy, draft, hasApprovedPhoto],
  );

  if (loading) return null;

  return (
    <section
      data-testid="profile-completeness-hints"
      className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {copy.title}
      </h2>
      <ul className="space-y-2 text-sm">
        {rows.map((row) => (
          <li
            key={row.key}
            data-testid={`profile-completeness-${row.key}`}
            className="flex items-center justify-between gap-3 text-zinc-800 dark:text-zinc-200"
          >
            <span>{row.label}</span>
            <span
              className={
                row.done
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-zinc-500 dark:text-zinc-400'
              }
            >
              {row.done ? copy.complete : copy.incomplete}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
