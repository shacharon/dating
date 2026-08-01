'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { listMyProfilePhotos } from '@/lib/me-photos-api';
import {
  buildCompletenessFlags,
  completenessScorePercent,
  suggestionChips,
} from '@/lib/profile-completeness';
import type { AppCopySchema } from '@/lib/i18n/types';

type Props = {
  draft: ProfileDraft | null;
  copy: AppCopySchema['profile']['hub'];
};

export function ProfileQualityMeter({ draft, copy }: Props) {
  const [hasApprovedPhoto, setHasApprovedPhoto] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyProfilePhotos();
        if (!cancelled) {
          setHasApprovedPhoto(rows.some((p) => p.status === 'APPROVED'));
        }
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

  const flags = useMemo(
    () => (draft ? buildCompletenessFlags(draft, hasApprovedPhoto) : null),
    [draft, hasApprovedPhoto],
  );

  const percent = flags ? completenessScorePercent(flags) : 0;
  const chips =
    flags != null
      ? suggestionChips(flags, {
          photo: copy.suggestionPhoto,
          basics: copy.suggestionBasics,
          nickname: copy.suggestionNickname,
          location: copy.suggestionLocation,
          aboutMe: copy.suggestionAboutMe,
          aboutPartner: copy.suggestionAboutPartner,
          aboutRelationship: copy.suggestionAboutRelationship,
        })
      : [];

  if (loading) {
    return (
      <div
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        data-testid="profile-quality-meter"
        role="status"
      >
        {copy.meterLoading}
      </div>
    );
  }

  if (!draft || !flags) {
    return (
      <div
        className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"
        data-testid="profile-quality-meter"
      >
        {copy.meterUnavailable}
      </div>
    );
  }

  return (
    <div
      className="space-y-3 rounded-xl border border-zinc-200 bg-white px-4 py-4 dark:border-zinc-700 dark:bg-zinc-900"
      data-testid="profile-quality-meter"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
          {copy.meterLabel}{' '}
          <span className="tabular-nums text-zinc-600 dark:text-zinc-300">
            {percent}%
          </span>
        </p>
        <Link
          href="/profile?tab=edit"
          className="inline-flex min-h-11 items-center text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
          data-testid="profile-quality-improve"
        >
          {copy.meterImprove}
        </Link>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={copy.meterLabel}
      >
        <div
          className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      {chips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <li key={chip.id}>
              <Link
                href={chip.href}
                className="inline-flex min-h-11 items-center rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                data-testid={`profile-quality-chip-${chip.id}`}
              >
                {chip.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
