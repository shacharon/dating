'use client';

import { useEffect, useState } from 'react';
import { NotificationPreferencesSection } from '@/components/notification-preferences-section';
import { DatingChapterPreferencesSection } from '@/components/dating-chapter-preferences-section';
import { MatchPreferencesPreviewCard } from '@/components/profile/match-preferences-preview-card';
import {
  matchPreferencesPreviewHasValues,
  matchPreferencesPreviewLines,
} from '@/components/profile/match-preferences-preview-display';
import { useAppLocale } from '@/lib/i18n';
import {
  emptyMatchPreferencesFormState,
  profileToMatchPreferencesForm,
  type MatchPreferencesFormState,
} from '@/lib/match-preferences-form';
import { resolveEditableProfile } from '@/lib/profile-form';

/** Profile hub Settings tab: notifications + match-prefs preview. */
export function ProfileSettingsTab() {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>(
    'loading',
  );
  const [form, setForm] = useState<MatchPreferencesFormState>(
    emptyMatchPreferencesFormState,
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const profile = await resolveEditableProfile();
        if (cancelled) return;
        if (!profile) {
          setForm(emptyMatchPreferencesFormState());
          setStatus('ready');
          return;
        }
        setForm(profileToMatchPreferencesForm(profile));
        setStatus('ready');
      } catch {
        if (!cancelled) {
          setForm(emptyMatchPreferencesFormState());
          setStatus('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const lines =
    status === 'ready' && matchPreferencesPreviewHasValues(form)
      ? matchPreferencesPreviewLines(form, copy)
      : [];

  return (
    <div className="space-y-8" data-testid="profile-settings-tab">
      <section id="notifications" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {hub.settingsNotificationsHeading}
        </h2>
        <NotificationPreferencesSection />
      </section>

      <section id="dating-chapter" className="scroll-mt-24 space-y-3">
        <DatingChapterPreferencesSection />
      </section>

      <MatchPreferencesPreviewCard
        heading={hub.settingsMatchPrefsHeading}
        title={copy.matchPreferences.sections.partnerGenders}
        lines={lines}
        emptyBody={hub.settingsMatchPrefsBody}
        ctaLabel={hub.settingsMatchPrefsCta}
        status={status === 'ready' ? 'ready' : status}
        statusText={
          status === 'loading'
            ? copy.common.loading
            : status === 'error'
              ? copy.matchPreferences.saveError
              : undefined
        }
      />
    </div>
  );
}
