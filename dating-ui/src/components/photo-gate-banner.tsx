'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyProfilePhotos } from '@/lib/api/me-photos-api';
import { useAppLocale } from '@/lib/i18n';

export function PhotoGateBanner() {
  const { copy: appCopy } = useAppLocale();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(true);

  const copy = appCopy.photoGate;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await listMyProfilePhotos();
        if (cancelled) return;
        const approvedCount = rows.filter((p) => p.status === 'APPROVED').length;
        setShow(approvedCount < 1);
      } catch {
        if (!cancelled) setShow(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !show) return null;

  return (
    <div
      data-testid="photo-gate-banner"
      className="rounded border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
      role="status"
    >
      <p>{copy.bannerMessage}</p>
      <Link
        href="#profile-photos"
        className="mt-1 inline-block text-sm font-medium text-amber-800 underline-offset-4 hover:underline dark:text-amber-300"
      >
        {copy.bannerLink}
      </Link>
    </div>
  );
}
