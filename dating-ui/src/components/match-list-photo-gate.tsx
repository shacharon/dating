'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { listMyProfilePhotos } from '@/lib/me-profile-api';
import { useAppLocale } from '@/lib/i18n';

/**
 * Blocking empty state when matches return `not_ready` / `no_photo`.
 * Stays on Matches (no silent redirect) and links the user to upload/review photos.
 */
export function MatchListPhotoGate() {
  const { copy } = useAppLocale();
  const gate = copy.matches.list.photoGate;
  const [pendingReview, setPendingReview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyProfilePhotos();
        if (cancelled) return;
        setPendingReview(rows.some((p) => p.status === 'PENDING'));
      } catch {
        if (!cancelled) setPendingReview(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      data-testid="match-list-photo-gate"
      className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-900/50 dark:bg-amber-950/30"
      role="status"
    >
      <p className="text-base font-medium text-amber-950 dark:text-amber-100">
        {gate.title}
      </p>
      <p className="mt-2 text-sm text-amber-900/90 dark:text-amber-200/90">
        {pendingReview ? gate.bodyPending : gate.body}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/dating/profile#profile-photos"
          data-testid="match-photo-gate-cta"
          className="rounded bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-700 dark:hover:bg-amber-600"
        >
          {gate.cta}
        </Link>
      </div>
    </div>
  );
}
