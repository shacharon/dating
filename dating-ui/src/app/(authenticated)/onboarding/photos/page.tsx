'use client';

import { InlineError } from '@/components/errors';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { useOnboardingPhotosForm } from '@/hooks/use-onboarding-photos-form';

export default function OnboardingPhotosPage() {
  const m = useOnboardingPhotosForm();

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6 py-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {m.pf.title}
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            {m.pf.body}
          </p>
        </header>

        {m.loadError ? <InlineError>{m.loadError}</InlineError> : null}
        {m.profileSyncing ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
            {m.syncingLabel}
          </p>
        ) : null}

        <div
          className={m.profileSyncing ? 'pointer-events-none opacity-60' : ''}
          aria-busy={m.profileSyncing}
        >
          <ProfilePhotoSection
            requiredForMatching
            onPhotosChange={m.onPhotosChange}
            onUploadingChange={m.setUploading}
          />

          <div className="mt-6 space-y-2">
            <button
              type="button"
              data-testid="onboarding-photos-finish"
              disabled={!m.canFinish}
              onClick={() => void m.handleFinish()}
              className="inline-flex min-h-11 items-center rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:focus-visible:outline-zinc-100"
            >
              {m.finishing ? '…' : m.pf.finishButton}
            </button>
            {!m.canFinish && !m.finishing ? (
              <p className="text-sm text-zinc-600 dark:text-zinc-400" role="status">
                {m.pf.finishHint}
              </p>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{m.pf.pendingNote}</p>
            )}
            {m.saveError ? <InlineError>{m.saveError}</InlineError> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
