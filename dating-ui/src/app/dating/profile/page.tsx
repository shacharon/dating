'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { profileToFormFields, resolveEditableProfile } from '@/lib/profile-form';
import type { ProfileDraft } from '../_lib/types';
import { NotificationPreferencesSection } from '@/components/notification-preferences-section';
import { ProfilePhotoSection } from '@/components/profile-photo-section';

function genderDisplay(g: string): string {
  const m: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    NON_BINARY: 'Non-binary',
    OTHER: 'Other',
    PREFER_NOT_TO_SAY: 'Prefer not to say',
  };
  return m[g] ?? g;
}

export default function ProfilePage() {
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
          setLoadError(e instanceof Error ? e.message : 'Failed to load profile');
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
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-xl space-y-6">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Profile
          </h1>
          <NotificationPreferencesSection />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Profile
          </h1>
          <NotificationPreferencesSection />
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Back to onboarding
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
            Profile
          </h1>
          <NotificationPreferencesSection />
          <p className="text-zinc-600 dark:text-zinc-400">
            You don’t have a profile yet. Complete onboarding to review and find matches.
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Go to onboarding
          </Link>
        </div>
      </div>
    );
  }

  const partnerLine =
    draft.desiredPartnerGenders.length > 0
      ? draft.desiredPartnerGenders.map(genderDisplay).join(', ')
      : '—';

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Your profile
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Review your answers before finding matches.
        </p>

        <NotificationPreferencesSection />

        <div className="space-y-4">
          <ProfilePhotoSection />

          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Basics
            </h2>
            <dl className="space-y-2 text-sm text-zinc-900 dark:text-zinc-100">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Nickname
                </dt>
                <dd>{draft.nickname?.trim() ? draft.nickname.trim() : '—'}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Birth date
                </dt>
                <dd>{draft.birthDate || '—'}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Gender
                </dt>
                <dd>{draft.gender ? genderDisplay(draft.gender) : '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Open to matching with
                </dt>
                <dd className="mt-0.5">{partnerLine}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  City
                </dt>
                <dd>{draft.city || '—'}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Country
                </dt>
                <dd>{draft.country || '—'}</dd>
              </div>
              <div>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">
                  Location label
                </dt>
                <dd className="mt-0.5">{draft.locationLabel || '—'}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              About me
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
              {draft.aboutMe || '—'}
            </p>
          </section>
          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              About partner
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
              {draft.aboutPartner || '—'}
            </p>
          </section>
          <section className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
            <h2 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              About relationship
            </h2>
            <p className="whitespace-pre-wrap text-sm text-zinc-900 dark:text-zinc-100">
              {draft.aboutRelationship || '—'}
            </p>
          </section>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/onboarding/basic?edit=1"
            className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Edit
          </Link>
          <Link
            href="/dating/me-matches"
            className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Find matches
          </Link>
        </div>
      </div>
    </div>
  );
}
