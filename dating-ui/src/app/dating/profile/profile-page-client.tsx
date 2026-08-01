'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { profileToFormFields, resolveEditableProfile } from '@/lib/profile-form';
import type { ProfileDraft } from '../_lib/types';
import { useAppLocale } from '@/lib/i18n';
import type { AppCopySchema } from '@/lib/i18n/types';
import { NotificationPreferencesSection } from '@/components/notification-preferences-section';
import { PhotoGateBanner } from '@/components/photo-gate-banner';
import { ProfileCompletenessHints } from '@/components/profile-completeness-hints';
import { ProfilePhotoSection } from '@/components/profile-photo-section';

function formatPartnerGenders(
  genders: string[],
  genderCopy: AppCopySchema['gender'],
  empty: string,
): string {
  if (genders.length === 0) return empty;
  return genders
    .map((g) => genderCopy[g as keyof AppCopySchema['gender']] ?? g)
    .join(', ');
}

export default function ProfilePage() {
  const { copy } = useAppLocale();
  const vp = copy.profile.viewPage;
  const bf = copy.onboarding.basicForm;
  const tf = copy.onboarding.textsForm;
  const genderCopy = copy.gender;
  const empty = vp.emptyValue;

  const [draft, setDraft] = useState<ProfileDraft | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await resolveEditableProfile();
        if (cancelled) {
          return;
        }
        if (!profile) {
          setDraft(null);
        } else {
          setDraft(profileToFormFields(profile));
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof Error ? e.message : copy.onboarding.loadFailed,
          );
          setDraft(null);
        }
      } finally {
        if (!cancelled) {
          setMounted(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [copy.onboarding.loadFailed]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {vp.titleProfile}
          </h1>
          <NotificationPreferencesSection />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {copy.common.loading}
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {vp.titleProfile}
          </h1>
          <NotificationPreferencesSection />
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {vp.backToOnboarding}
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            {vp.titleProfile}
          </h1>
          <NotificationPreferencesSection />
          <p className="text-zinc-600 dark:text-zinc-400">{vp.noProfileBody}</p>
          <Link
            href="/onboarding"
            className="inline-block rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {copy.matchPreferences.goToOnboarding}
          </Link>
        </div>
      </div>
    );
  }

  const partnerLine = formatPartnerGenders(
    draft.desiredPartnerGenders,
    genderCopy,
    empty,
  );

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          {vp.titleReview}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{vp.subtitle}</p>

        <PhotoGateBanner />
        <ProfileCompletenessHints draft={draft} />

        <NotificationPreferencesSection />

        <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {vp.matchingSectionTitle}
          </h2>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            {copy.profile.matchPreferencesLinkHelp}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/settings/preferences"
              data-testid="profile-match-preferences-link"
              className="inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {vp.matchPreferencesLinkCta(copy.profile.matchPreferencesLink)}
            </Link>
            <Link
              href="/profile?tab=analysis"
              data-testid="profile-analysis-link"
              className="inline-block text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300"
            >
              {vp.analysisLinkCta(copy.nav.analysis)}
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          <ProfilePhotoSection />

          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {bf.sectionTitle}
            </h2>
            <dl className="space-y-2 text-sm text-zinc-900 dark:text-zinc-100">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.nicknameLabel}
                </dt>
                <dd>{draft.nickname?.trim() ? draft.nickname.trim() : empty}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.birthDateLabel}
                </dt>
                <dd>{draft.birthDate || empty}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.genderLabel}
                </dt>
                <dd>
                  {draft.gender
                    ? genderCopy[draft.gender as keyof typeof genderCopy] ??
                      draft.gender
                    : empty}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.partnerGendersLegend}
                </dt>
                <dd className="mt-0.5">{partnerLine}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.cityLabel}
                </dt>
                <dd>{draft.city || empty}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.countryLabel}
                </dt>
                <dd>{draft.country || empty}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  {bf.locationLabelLabel}
                </dt>
                <dd className="mt-0.5">{draft.locationLabel || empty}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {tf.aboutMeLabel}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
              {draft.aboutMe || empty}
            </p>
          </section>
          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {tf.aboutPartnerLabel}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
              {draft.aboutPartner || empty}
            </p>
          </section>
          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {tf.aboutRelationshipLabel}
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
              {draft.aboutRelationship || empty}
            </p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/profile?tab=edit"
            className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {vp.editLink}
          </Link>
          <Link
            href="/dating/me-matches"
            className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {vp.findMatchesLink}
          </Link>
        </div>
      </div>
    </div>
  );
}
