'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getActiveProfileId, setActiveProfileId } from '../_lib/active-profile-session';
import {
  buildCreatePayload,
  buildUpdatePayload,
  profileToFormFields,
  resolveEditableProfile,
} from '../_lib/profile-resolve';
import { createProfile, updateProfile } from '../_lib/user-profiles-api';

function isFormEmpty(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): boolean {
  return (
    !aboutMe.trim() &&
    !aboutPartner.trim() &&
    !aboutRelationship.trim()
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [aboutMe, setAboutMe] = useState('');
  const [aboutPartner, setAboutPartner] = useState('');
  const [aboutRelationship, setAboutRelationship] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await resolveEditableProfile();
        if (cancelled || !profile) {
          if (!cancelled) {
            setHydrated(true);
          }
          return;
        }
        const fields = profileToFormFields(profile);
        if (!cancelled) {
          setAboutMe(fields.aboutMe);
          setAboutPartner(fields.aboutPartner);
          setAboutRelationship(fields.aboutRelationship);
          setHydrated(true);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Failed to load profile');
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function persistToApi(): Promise<boolean> {
    setSaveError(null);
    const empty = isFormEmpty(aboutMe, aboutPartner, aboutRelationship);
    const id = getActiveProfileId();

    if (empty && !id) {
      setSaveError('Add something to save.');
      return false;
    }

    try {
      if (id) {
        const updated = await updateProfile(id, buildUpdatePayload(aboutMe, aboutPartner, aboutRelationship));
        setActiveProfileId(updated.id);
      } else {
        const created = await createProfile(
          buildCreatePayload(aboutMe, aboutPartner, aboutRelationship),
        );
        setActiveProfileId(created.id);
      }
      return true;
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      return false;
    }
  }

  async function handleSaveDraft() {
    const ok = await persistToApi();
    if (ok) {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }
  }

  async function handleContinue() {
    const empty = isFormEmpty(aboutMe, aboutPartner, aboutRelationship);
    const id = getActiveProfileId();
    if (empty && !id) {
      router.push('/dating/profile');
      return;
    }
    const ok = await persistToApi();
    if (ok) {
      router.push('/dating/profile');
    }
  }

  if (!hydrated) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-xl">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Onboarding
        </h1>

        {loadError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {loadError}
          </p>
        )}

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleContinue();
          }}
        >
          <div>
            <label
              htmlFor="about-me"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              About me
            </label>
            <textarea
              id="about-me"
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              rows={4}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="Describe yourself…"
            />
          </div>

          <div>
            <label
              htmlFor="about-partner"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              About partner
            </label>
            <textarea
              id="about-partner"
              value={aboutPartner}
              onChange={(e) => setAboutPartner(e.target.value)}
              rows={4}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="What you look for in a partner…"
            />
          </div>

          <div>
            <label
              htmlFor="about-relationship"
              className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              About relationship
            </label>
            <textarea
              id="about-relationship"
              value={aboutRelationship}
              onChange={(e) => setAboutRelationship(e.target.value)}
              rows={4}
              className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400"
              placeholder="What you want from a relationship…"
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => void handleSaveDraft()}
              className="rounded border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Save draft
            </button>
            <button
              type="submit"
              className="rounded bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Continue
            </button>
          </div>

          {draftSaved && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
              Draft saved.
            </p>
          )}
          {saveError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {saveError}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
