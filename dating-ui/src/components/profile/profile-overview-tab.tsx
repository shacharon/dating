'use client';

import Link from 'next/link';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import { PhotoGateBanner } from '@/components/photo-gate-banner';
import { ProfilePhotoSection } from '@/components/profile-photo-section';
import { useAppLocale } from '@/lib/i18n';
import type { AppCopySchema } from '@/lib/i18n/types';

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

type Props = {
  draft: ProfileDraft;
};

export function ProfileOverviewTab({ draft }: Props) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const vp = copy.profile.viewPage;
  const bf = copy.onboarding.basicForm;
  const tf = copy.onboarding.textsForm;
  const genderCopy = copy.gender;
  const empty = vp.emptyValue;
  const partnerLine = formatPartnerGenders(
    draft.desiredPartnerGenders,
    genderCopy,
    empty,
  );

  return (
    <div className="space-y-6" data-testid="profile-overview-tab">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{vp.subtitle}</p>

      <PhotoGateBanner />

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
                  ? (genderCopy[draft.gender as keyof typeof genderCopy] ??
                    draft.gender)
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
          data-testid="profile-overview-edit"
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {hub.editProfileCta}
        </Link>
        <Link
          href="/profile?tab=analysis"
          data-testid="profile-analysis-link"
          className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {vp.analysisLinkCta(copy.nav.analysis)}
        </Link>
        <Link
          href="/dating/me-matches"
          className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {vp.findMatchesLink}
        </Link>
      </div>
    </div>
  );
}
