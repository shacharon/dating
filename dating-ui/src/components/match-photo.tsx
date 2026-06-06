'use client';

import { useEffect, useState } from 'react';
import {
  matchPhotoPlaceholderInitial,
  matchPhotoSrc,
} from '@/lib/match-photo';

export type MatchPhotoVariant = 'list' | 'hero' | 'celebration' | 'header';

export interface MatchPhotoProps {
  photoUrl: string | null;
  displayName: string;
  variant: MatchPhotoVariant;
  className?: string;
  testId?: string;
}

const variantClasses: Record<MatchPhotoVariant, string> = {
  list: 'h-14 w-14 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800',
  hero: 'aspect-[4/3] w-full object-cover bg-zinc-100 dark:bg-zinc-800',
  celebration:
    'h-28 w-28 rounded-full object-cover ring-4 ring-emerald-100 dark:ring-emerald-900/50',
  header: 'h-20 w-20 shrink-0 rounded-full object-cover bg-zinc-100 dark:bg-zinc-800',
};

const placeholderClasses: Record<MatchPhotoVariant, string> = {
  list: 'flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  hero: 'flex aspect-[4/3] w-full items-center justify-center bg-zinc-100 text-4xl font-semibold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500',
  celebration:
    'flex h-28 w-28 items-center justify-center rounded-full bg-zinc-100 text-3xl font-semibold text-zinc-400 ring-4 ring-emerald-100 dark:bg-zinc-800 dark:text-zinc-500 dark:ring-emerald-900/50',
  header:
    'flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-lg font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

export function MatchPhoto({
  photoUrl,
  displayName,
  variant,
  className,
  testId = 'match-list-photo',
}: MatchPhotoProps) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [photoUrl]);

  const src = matchPhotoSrc(photoUrl);
  const initial = matchPhotoPlaceholderInitial(displayName);
  const showImage = Boolean(src) && !loadFailed;

  if (!showImage) {
    return (
      <div
        className={[placeholderClasses[variant], className].filter(Boolean).join(' ')}
        data-testid={testId}
        aria-hidden={variant !== 'hero'}
        aria-label={variant === 'hero' ? displayName : undefined}
      >
        {initial}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- session-authenticated dynamic URLs
    <img
      src={src!}
      alt={variant === 'hero' ? displayName : ''}
      className={[variantClasses[variant], className].filter(Boolean).join(' ')}
      data-testid={testId}
      onError={() => setLoadFailed(true)}
    />
  );
}
