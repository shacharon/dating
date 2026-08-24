'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import {
  matchPhotoPlaceholderInitial,
  matchPhotoSrc,
  shouldOptimizePhotoSrc,
} from '@/lib/matches/match-photo';

export type MatchPhotoVariant =
  | 'list'
  | 'hero'
  | 'browse'
  | 'celebration'
  | 'header';

export interface MatchPhotoProps {
  photoUrl: string | null;
  displayName: string;
  variant: MatchPhotoVariant;
  className?: string;
  testId?: string;
  /** Prioritize first viewport images (CDN / next/image only). */
  priority?: boolean;
}

const variantClasses: Record<MatchPhotoVariant, string> = {
  list: 'h-14 w-14 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800',
  hero: 'aspect-[4/3] w-full object-cover bg-zinc-100 dark:bg-zinc-800',
  browse: 'h-full w-full object-cover bg-zinc-100 dark:bg-zinc-800',
  celebration:
    'h-28 w-28 rounded-full object-cover ring-4 ring-emerald-100 dark:ring-emerald-900/50',
  header: 'h-20 w-20 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800',
};

const placeholderClasses: Record<MatchPhotoVariant, string> = {
  list: 'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  hero: 'flex aspect-[4/3] w-full items-center justify-center bg-zinc-100 text-4xl font-semibold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
  browse:
    'flex h-full w-full items-center justify-center bg-zinc-100 text-4xl font-semibold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
  celebration:
    'flex h-28 w-28 items-center justify-center rounded-full bg-zinc-100 text-3xl font-semibold text-zinc-400 ring-4 ring-emerald-100 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-emerald-900/50',
  header:
    'flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

const skeletonClasses: Record<MatchPhotoVariant, string> = {
  list: 'h-14 w-14 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700',
  hero: 'aspect-[4/3] w-full animate-pulse bg-zinc-200 dark:bg-zinc-700',
  browse: 'absolute inset-0 h-full w-full animate-pulse bg-zinc-200 dark:bg-zinc-700',
  celebration:
    'h-28 w-28 animate-pulse rounded-full bg-zinc-200 ring-4 ring-emerald-100 dark:bg-zinc-700 dark:ring-emerald-900/50',
  header: 'h-20 w-20 shrink-0 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700',
};

const sizesByVariant: Record<MatchPhotoVariant, string> = {
  list: '112px',
  header: '112px',
  celebration: '112px',
  hero: '(max-width: 768px) 100vw, 800px',
  browse: '(max-width: 768px) 100vw, 672px',
};

const namedAltVariants = new Set<MatchPhotoVariant>(['hero', 'browse']);
const fillVariants = new Set<MatchPhotoVariant>(['browse']);

export function MatchPhoto({
  photoUrl,
  displayName,
  variant,
  className,
  testId = 'match-list-photo',
  priority = false,
}: MatchPhotoProps) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
    setImageLoaded(false);
  }, [photoUrl]);

  const src = matchPhotoSrc(photoUrl);
  const initial = matchPhotoPlaceholderInitial(displayName);
  const showImage = Boolean(src) && !loadFailed;
  const useNamedAlt = namedAltVariants.has(variant);
  const fillsParent = fillVariants.has(variant);

  if (!showImage) {
    return (
      <div
        className={[placeholderClasses[variant], className].filter(Boolean).join(' ')}
        data-testid={testId}
        aria-hidden={!useNamedAlt}
        aria-label={useNamedAlt ? displayName : undefined}
      >
        {initial}
      </div>
    );
  }

  const imgClass = [variantClasses[variant], className].filter(Boolean).join(' ');
  const optimize = shouldOptimizePhotoSrc(src!);
  const isLarge = variant === 'hero' || variant === 'browse';

  return (
    <div
      className={
        fillsParent ? 'relative block h-full w-full' : 'relative inline-block'
      }
    >
      {!imageLoaded && (
        <div
          className={skeletonClasses[variant]}
          data-testid={`${testId}-skeleton`}
          aria-hidden
        />
      )}
      {optimize ? (
        <Image
          src={src!}
          alt={useNamedAlt ? displayName : ''}
          width={isLarge ? 800 : 112}
          height={isLarge ? 600 : 112}
          sizes={sizesByVariant[variant]}
          className={[imgClass, imageLoaded ? '' : 'absolute opacity-0'].join(' ')}
          data-testid={testId}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          onLoad={() => setImageLoaded(true)}
          onError={() => setLoadFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- AuthGuard / relative cookie URLs (optimizer has no session)
        <img
          src={src!}
          alt={useNamedAlt ? displayName : ''}
          className={[imgClass, imageLoaded ? '' : 'absolute opacity-0'].join(' ')}
          data-testid={testId}
          loading={priority ? 'eager' : 'lazy'}
          onLoad={() => setImageLoaded(true)}
          onError={() => setLoadFailed(true)}
        />
      )}
    </div>
  );
}
