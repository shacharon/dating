'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  buildCreatePayload,
  buildPatchPayload,
  emptyProfileFormState,
  isProfileFormEmpty,
  profileToFormFields,
  resolveEditableProfile,
  type ProfileFormState,
} from '@/lib/profile-form';
import {
  createMyProfile,
  ME_PARTNER_GENDER_CHOICES,
  ME_PROFILE_GENDERS,
  patchMyProfile,
  type MeProfileGender,
} from '@/lib/me-profile-api';

function genderLabel(g: MeProfileGender): string {
  const labels: Record<MeProfileGender, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    NON_BINARY: 'Non-binary',
    OTHER: 'Other',
    PREFER_NOT_TO_SAY: 'Prefer not to say',
  };
  return labels[g];
}

export function OnboardingDraftForm() {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState>(() =>
    emptyProfileFormState(),
  );
  const [hasProfile, setHasProfile] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const birthDateMax = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const profile = await resolveEditableProfile();
        if (cancelled) {
          return;
        }
        if (!profile) {
          setHasProfile(false);
          setHydrated(true);
          return;
        }
        setHasProfile(true);
        setForm(profileToFormFields(profile));
        setHydrated(true);
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

  function setPartnerGender(g: MeProfileGender, checked: boolean) {
    setForm((prev) => {
      const next = new Set(prev.desiredPartnerGenders);
      if (checked) {
        next.add(g);
      } else {
        next.delete(g);
      }
      return {
        ...prev,
        desiredPartnerGenders: Array.from(next) as MeProfileGender[],
      };
    });
  }

  async function persistToApi(): Promise<boolean> {
    setSaveError(null);
    const payload = hasProfile ? buildPatchPayload(form) : buildCreatePayload(form);
    try {
      if (hasProfile) {
        await patchMyProfile(payload);
      } else {
        try {
          await createMyProfile(payload);
          setHasProfile(true);
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          if (
            msg.includes(' 409 ') ||
            msg.toLowerCase().includes('profile_already_exists')
          ) {
            await patchMyProfile(payload);
            setHasProfile(true);
          } else {
            throw e;
          }
        }
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
    const empty = isProfileFormEmpty(form);
    if (empty && !hasProfile) {
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
      <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your draft…</p>
    );
  }

  const inputClass =
    'w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-400';
  const labelClass =
    'mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300';

  return (
    <div className="space-y-6">
      {loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {loadError}
        </p>
      ) : null}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void handleContinue();
        }}
      >
        <div className="rounded border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
          <h2 className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Basics
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-1">
              <label htmlFor="birth-date" className={labelClass}>
                Birth date
              </label>
              <input
                id="birth-date"
                type="date"
                max={birthDateMax}
                value={form.birthDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, birthDate: e.target.value }))
                }
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-1">
              <label htmlFor="gender" className={labelClass}>
                Gender
              </label>
              <select
                id="gender"
                value={form.gender}
                onChange={(e) =>
                  setForm((f) => ({ ...f, gender: e.target.value }))
                }
                className={inputClass}
              >
                <option value="">Not specified</option>
                {ME_PROFILE_GENDERS.map((g) => (
                  <option key={g} value={g}>
                    {genderLabel(g)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="mt-4">
            <legend className={`${labelClass} mb-2`}>
              Open to matching with
            </legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ME_PARTNER_GENDER_CHOICES.map((g) => (
                <label
                  key={g}
                  className="flex cursor-pointer items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200"
                >
                  <input
                    type="checkbox"
                    checked={form.desiredPartnerGenders.includes(g)}
                    onChange={(e) => setPartnerGender(g, e.target.checked)}
                    className="rounded border-zinc-400 text-zinc-900 dark:border-zinc-500"
                  />
                  {genderLabel(g)}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Optional — leave unchecked if you have not decided yet.
            </p>
          </fieldset>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className={labelClass}>
                City
              </label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                className={inputClass}
                placeholder="e.g. Tel Aviv"
                autoComplete="address-level2"
              />
            </div>
            <div>
              <label htmlFor="country" className={labelClass}>
                Country
              </label>
              <input
                id="country"
                type="text"
                value={form.country}
                onChange={(e) =>
                  setForm((f) => ({ ...f, country: e.target.value }))
                }
                className={inputClass}
                placeholder="e.g. IL"
                autoComplete="country-name"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="location-label" className={labelClass}>
                Location label
              </label>
              <input
                id="location-label"
                type="text"
                value={form.locationLabel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, locationLabel: e.target.value }))
                }
                className={inputClass}
                placeholder="e.g. Tel Aviv, Israel"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="about-me" className={labelClass}>
            About me
          </label>
          <textarea
            id="about-me"
            value={form.aboutMe}
            onChange={(e) =>
              setForm((f) => ({ ...f, aboutMe: e.target.value }))
            }
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            placeholder="Describe yourself…"
          />
        </div>

        <div>
          <label htmlFor="about-partner" className={labelClass}>
            About partner
          </label>
          <textarea
            id="about-partner"
            value={form.aboutPartner}
            onChange={(e) =>
              setForm((f) => ({ ...f, aboutPartner: e.target.value }))
            }
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            placeholder="What you look for in a partner…"
          />
        </div>

        <div>
          <label htmlFor="about-relationship" className={labelClass}>
            About relationship
          </label>
          <textarea
            id="about-relationship"
            value={form.aboutRelationship}
            onChange={(e) =>
              setForm((f) => ({ ...f, aboutRelationship: e.target.value }))
            }
            rows={4}
            className={`${inputClass} min-h-[6rem]`}
            placeholder="What you want from a relationship…"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
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
          <Link
            href="/dating"
            className="text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Continue later
          </Link>
        </div>

        {draftSaved ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400" role="status">
            Draft saved.
          </p>
        ) : null}
        {saveError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        ) : null}
      </form>
    </div>
  );
}
