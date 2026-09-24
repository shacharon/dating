'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { MatchPhoto } from '@/components/match-photo';
import {
  galleryDotKinds,
  overviewDisplayName,
  overviewLocationLine,
  overviewTitleLine,
  pickHeroPhoto,
  type GalleryDotKind,
} from '@/components/profile/profile-overview-display';
import { useAppLocale } from '@/lib/i18n';
import { profileEditHash } from '@/lib/profile/profile-hub-paths';
import {
  fetchMyProfilePhotoBlob,
  type MeProfilePhotoDto,
} from '@/lib/api/me-photos-api';

type Props = {
  draft: ProfileDraft;
  photos: MeProfilePhotoDto[];
};

const DOT_CLASS: Record<GalleryDotKind, string> = {
  approved: 'bg-emerald-500 dark:bg-emerald-400',
  pending: 'bg-amber-400 dark:bg-amber-300',
  empty: 'border-2 border-zinc-300 bg-transparent dark:border-zinc-600',
};

/**
 * Overview dating card: primary photo + identity overlay (no story teaser).
 * Empty photo uses a designed placeholder — never MatchPhoto grey/`?`.
 */
export function ProfileOverviewHero({ draft, photos }: Props) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;

  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  const displayName = overviewDisplayName(draft) ?? hub.overviewNameEmpty;
  const title = overviewTitleLine(draft, hub.overviewNameEmpty);
  const location = overviewLocationLine(draft);
  const dots = galleryDotKinds(photos);
  const hero = pickHeroPhoto(photos);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    if (!hero) {
      setHeroUrl(null);
      return;
    }
    (async () => {
      try {
        const blob = await fetchMyProfilePhotoBlob(hero.id);
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setHeroUrl(objectUrl);
      } catch {
        if (!cancelled) setHeroUrl(null);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [hero]);

  const showPhoto = Boolean(hero && heroUrl);
  /** Dots only when we actually have a renderable hero (not meta-only / failed blob). */
  const showDots = showPhoto && photos.length > 0;

  return (
    <div className="space-y-4" data-testid="profile-overview-hero">
      <div className="relative w-full overflow-hidden rounded-2xl">
        {showPhoto ? (
          <div className="block w-full [&_>div]:!block [&_>div]:!w-full">
            <MatchPhoto
              variant="hero"
              photoUrl={heroUrl}
              displayName={displayName}
              testId="profile-overview-hero-photo"
              priority
              className="!aspect-[3/4] w-full"
            />
          </div>
        ) : (
          <div
            className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 bg-gradient-to-b from-zinc-200 to-zinc-300 px-6 text-center dark:from-zinc-800 dark:to-zinc-900"
            data-testid="profile-overview-photo-empty"
          >
            <p className="max-w-xs text-base font-medium text-zinc-800 dark:text-zinc-100">
              {hub.overviewPhotoEmptyTitle}
            </p>
            <Link
              href={profileEditHash('photos')}
              className="inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
            >
              {hub.overviewPhotoEmptyCta}
            </Link>
          </div>
        )}

        {(showPhoto || title) && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-20 sm:px-6 sm:pb-5"
            data-testid="profile-overview-hero-overlay"
          >
            <p className="truncate text-base font-semibold text-white drop-shadow sm:text-lg">
              {title}
            </p>
            {location && (
              <p className="mt-0.5 truncate text-sm text-white/90 drop-shadow">
                {location}
              </p>
            )}
          </div>
        )}
      </div>

      {showDots && (
        <div
          className="flex items-center justify-center gap-2"
          data-testid="profile-overview-gallery-dots"
          aria-hidden
        >
          {dots.map((kind, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full ${DOT_CLASS[kind]}`}
              data-dot={kind}
            />
          ))}
        </div>
      )}
    </div>
  );
}
