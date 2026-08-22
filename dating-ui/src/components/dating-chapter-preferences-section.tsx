'use client';

import { useEffect, useState } from 'react';
import {
  DatingChapterFields,
  type DatingChapterValue,
} from '@/components/dating-chapter-fields';
import { useAppLocale } from '@/lib/i18n';
import { usePatchProfile, useProfile } from '@/hooks/use-profile';

/** Settings: persist dating chapter via PATCH /me/profile. */
export function DatingChapterPreferencesSection() {
  const { copy } = useAppLocale();
  const dc = copy.profile.datingChapter;
  const { profile, isLoading, error: profileError } = useProfile();
  const patchMutation = usePatchProfile();

  const [value, setValue] = useState<DatingChapterValue | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (initialized) return;
    if (profileError) {
      setError(dc.saveError);
      setInitialized(true);
      return;
    }
    const chapter = profile?.datingChapter ?? null;
    setValue(
      chapter === 'first_chapter' ||
        chapter === 'ready_again' ||
        chapter === 'new_chapter'
        ? chapter
        : null,
    );
    setInitialized(true);
  }, [profile, isLoading, profileError, initialized, dc.saveError]);

  const loading = isLoading || !initialized;

  const persist = async (next: DatingChapterValue | null) => {
    setError(null);
    setSaving(true);
    setSavedFlash(false);
    try {
      await patchMutation.mutateAsync({ datingChapter: next });
      setValue(next);
      setSavedFlash(true);
    } catch {
      setError(dc.saveError);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      id="dating-chapter-prefs"
      className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      aria-labelledby="dating-chapter-prefs-title"
      data-testid="dating-chapter-preferences"
    >
      <h2
        id="dating-chapter-prefs-title"
        className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {dc.settingsTitle}
      </h2>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {dc.settingsSubtitle}
      </p>
      {loading ? (
        <p className="text-xs text-zinc-500">{copy.common.loading}</p>
      ) : (
        <DatingChapterFields
          copy={dc}
          value={value}
          disabled={saving}
          allowClear
          clearLabel={dc.clearLabel}
          onChange={(next) => void persist(next)}
        />
      )}
      {error ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
      {savedFlash ? (
        <p
          className="mt-2 text-xs text-emerald-700 dark:text-emerald-400"
          aria-live="polite"
        >
          {dc.savedFlash}
        </p>
      ) : null}
    </section>
  );
}
