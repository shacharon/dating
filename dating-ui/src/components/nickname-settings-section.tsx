'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppLocale } from '@/lib/i18n';
import { usePatchProfile, useProfile } from '@/hooks/use-profile';
import { normalizeNicknameValue } from '@/components/onboarding-basic-helpers';

function isNicknameTakenError(e: unknown): boolean {
  return (
    e instanceof Error &&
    /nickname is already taken|nicknameTaken|already taken/i.test(e.message)
  );
}

/** Settings: persist nickname via PATCH /me/profile. */
export function NicknameSettingsSection() {
  const { copy } = useAppLocale();
  const ns = copy.profile.nicknameSettings;
  const { user } = useAuth();
  const googleName = user?.displayName?.trim() || '—';
  const { profile, isLoading, error: profileError } = useProfile();
  const patchMutation = usePatchProfile();

  const [nickname, setNickname] = useState('');
  const [loadedNickname, setLoadedNickname] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (initialized) return;
    if (profileError) {
      setSaveError(ns.saveError);
      setInitialized(true);
      return;
    }
    const next = profile?.nickname ?? '';
    setNickname(next);
    setLoadedNickname(normalizeNicknameValue(next));
    setInitialized(true);
  }, [profile, isLoading, profileError, initialized, ns.saveError]);

  const loading = isLoading || !initialized;
  const dirty =
    normalizeNicknameValue(nickname.trim() ? nickname.trim() : null) !==
    loadedNickname;

  async function handleSave() {
    setFieldError(null);
    setSaveError(null);
    setSavedFlash(false);
    setSaving(true);
    const next = normalizeNicknameValue(nickname.trim() ? nickname.trim() : null);
    try {
      await patchMutation.mutateAsync({ nickname: next });
      setNickname(next ?? '');
      setLoadedNickname(next);
      setSavedFlash(true);
    } catch (e) {
      if (isNicknameTakenError(e)) {
        setFieldError(ns.nicknameTakenError);
      } else {
        setSaveError(e instanceof Error ? e.message : ns.saveError);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      aria-labelledby="nickname-settings-title"
      data-testid="nickname-settings"
    >
      <h2
        id="nickname-settings-title"
        className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {ns.settingsTitle}
      </h2>
      <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
        {ns.settingsSubtitle}
      </p>

      {loading ? (
        <p className="text-xs text-zinc-500">{copy.common.loading}</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded border border-dashed border-zinc-300 bg-zinc-50/80 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950/40">
            <span className="font-medium text-zinc-600 dark:text-zinc-400">
              {ns.googleNameLabel}
            </span>
            <p className="text-zinc-900 dark:text-zinc-100">{googleName}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {ns.googleNameHelp}
            </p>
          </div>

          <div>
            <label
              htmlFor="settings-nickname"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              {ns.nicknameLabel}
            </label>
            <input
              id="settings-nickname"
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setFieldError(null);
              }}
              disabled={saving}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder={ns.nicknamePlaceholder}
              autoComplete="off"
              maxLength={80}
              aria-invalid={Boolean(fieldError)}
              aria-describedby={
                fieldError ? 'settings-nickname-error' : undefined
              }
            />
            {fieldError ? (
              <p
                id="settings-nickname-error"
                className="mt-1 text-xs text-red-600 dark:text-red-400"
                role="alert"
              >
                {fieldError}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            data-testid="nickname-settings-save"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
          >
            {saving ? '…' : ns.saveButton}
          </button>
        </div>
      )}

      {saveError ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
          {saveError}
        </p>
      ) : null}
      {savedFlash ? (
        <p
          className="mt-2 text-xs text-emerald-700 dark:text-emerald-400"
          aria-live="polite"
        >
          {ns.savedFlash}
        </p>
      ) : null}
    </section>
  );
}
