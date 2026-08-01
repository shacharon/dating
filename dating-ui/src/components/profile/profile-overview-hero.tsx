'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { MatchPhoto } from '@/components/match-photo';
import {
  galleryDotKinds,
  overviewDisplayName,
  overviewLocationLine,
  overviewPartnerLine,
  overviewTitleLine,
  pickHeroPhoto,
  type GalleryDotKind,
} from '@/components/profile/profile-overview-display';
import { useAppLocale } from '@/lib/i18n';
import {
  fetchMyProfilePhotoBlob,
  listMyProfilePhotos,
  type MeProfilePhotoDto,
} from '@/lib/me-photos-api';

type Props = {
  draft: ProfileDraft;
};

const DOT_CLASS: Record<GalleryDotKind, string> = {
  approved: 'bg-emerald-500 dark:bg-emerald-400',
  pending: 'bg-amber-400 dark:bg-amber-300',
  empty: 'border-2 border-zinc-300 bg-transparent dark:border-zinc-600',
};

/**
 * Overview hero match card: primary photo + identity overlay, story teaser,
 * gallery dots, and Edit CTA. Upload stays on the Edit tab.
 */
export function ProfileOverviewHero({ draft }: Props) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const bf = copy.onboarding.basicForm;
  const vp = copy.profile.viewPage;

  const [photos, setPhotos] = useState<MeProfilePhotoDto[]>([]);
  const [heroUrl, setHeroUrl] = useState<string | null>(null);

  const title = overviewTitleLine(draft);
  const displayName = overviewDisplayName(draft);
  const location = overviewLocationLine(draft);
  const partner = overviewPartnerLine(draft.desiredPartnerGenders, copy.gender);
  const about = draft.aboutMe?.trim() ?? '';
  const dots = galleryDotKinds(photos);

  useEffect(() => {
    let cancelled = false;
    listMyProfilePhotos()
      .then((list) => {
        if (!cancelled) setPhotos(list);
      })
      .catch(() => {
        if (!cancelled) setPhotos([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    const hero = pickHeroPhoto(photos);
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
  }, [photos]);

  return (
    <div className="space-y-6" data-testid="profile-overview-hero">
      <div className="relative w-full overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800">
        <div className="block w-full [&_>div]:!block [&_>div]:!w-full">
          <MatchPhoto
            variant="hero"
            photoUrl={heroUrl}
            displayName={displayName}
            testId="profile-overview-hero-photo"
            priority
            className="w-full"
          />
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-16 sm:px-6 sm:pb-5"
          data-testid="profile-overview-hero-overlay"
        >
          <p className="truncate text-base font-semibold text-white drop-shadow sm:text-lg">
            {title === '?' ? vp.emptyValue : title}
          </p>
          {location && (
            <p className="mt-0.5 truncate text-sm text-white/90 drop-shadow">
              {location}
            </p>
          )}
          {partner && (
            <p className="mt-0.5 truncate text-sm text-white/85 drop-shadow">
              {bf.partnerGendersLegend}: {partner}
            </p>
          )}
        </div>
      </div>

      {about ? (
        <p
          className="line-clamp-2 text-base leading-relaxed text-zinc-700 md:line-clamp-3 dark:text-zinc-300"
          data-testid="profile-overview-story-teaser"
        >
          {about}
        </p>
      ) : (
        <div
          className="space-y-2 py-2 text-center text-sm text-zinc-500 dark:text-zinc-400"
          data-testid="profile-overview-story-empty"
        >
          <p>{vp.subtitle}</p>
          <Link
            href="/profile?tab=edit#story"
            className="inline-block font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {hub.editProfileCta}
          </Link>
        </div>
      )}

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

      <div className="flex justify-center pt-1">
        <Link
          href="/profile?tab=edit"
          data-testid="profile-overview-edit"
          className="inline-flex rounded-lg bg-blue-600 px-8 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          {hub.editProfileCta}
        </Link>
      </div>
    </div>
  );
}
