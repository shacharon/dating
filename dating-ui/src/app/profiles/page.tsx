'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiBase } from '@/lib/api-base';
import {
  listProfiles,
  getProfileById,
  analyzeProfile,
  type ProfileListItem,
  type ProfilePayload,
} from '@/lib/profiles-api';
import { ProfileDetailPanel } from './profile-detail-panel';

const API_ORIGIN = getApiBase();

export default function ProfilesPage() {
  const [listLoading, setListLoading] = useState(true);
  const [items, setItems] = useState<ProfileListItem[]>([]);
  const [listError, setListError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeMessage, setAnalyzeMessage] = useState<string | null>(null);

  /** POC: filter text for profile autocomplete (not the canonical selected label). */
  const [profileSearch, setProfileSearch] = useState('');
  const [profilePickerOpen, setProfilePickerOpen] = useState(false);

  const preferredProfileId =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('profileId')?.trim() || ''
      : '';
  const legacyChipsUx =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('chipsUx') === 'old';

  const fetchList = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await listProfiles();
      setItems(data);
      const preferredExists = preferredProfileId
        ? data.some((item: ProfileListItem) => item.id === preferredProfileId)
        : false;
      setSelectedId((prev) =>
        prev ? prev : preferredExists ? preferredProfileId : data[0]?.id ?? '',
      );
    } catch (err) {
      setListError(err instanceof Error ? err.message : 'Request failed.');
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, [preferredProfileId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filteredProfileItems = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return items.slice(0, 80);
    return items
      .filter(
        (item) =>
          item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q),
      )
      .slice(0, 80);
  }, [items, profileSearch]);

  const selectedListItem = useMemo(
    () => items.find((i) => i.id === selectedId),
    [items, selectedId],
  );

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      setProfileError(null);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    setProfile(null);
    getProfileById(selectedId)
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setProfileError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(err instanceof Error ? err.message : 'Request failed.');
          setProfile(null);
        }
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function analyzeSelectedProfile(): Promise<void> {
    if (!selectedId || analyzing) return;
    setAnalyzeMessage(null);
    setAnalyzing(true);
    try {
      await analyzeProfile(selectedId);

      // Refresh the selected profile after analysis so UI shows latest result.
      const profileData = await getProfileById(selectedId);
      setProfile(profileData);
      setAnalyzeMessage('Analysis complete.');
    } catch (err) {
      setAnalyzeMessage(err instanceof Error ? err.message : 'Analyze failed.');
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
            Profile Viewer
          </h1>
          <Link
            href="/profiles/compare"
            className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Compare enrichment (side-by-side)
          </Link>
        </div>

        <div>
          <label
            htmlFor="profile-search"
            className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Saved profile
          </label>
          {listLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : listError ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {listError}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              No saved profiles found.
            </p>
          ) : (
            <div className="relative">
              <input
                id="profile-search"
                type="search"
                autoComplete="off"
                value={profileSearch}
                onChange={(e) => {
                  setProfileSearch(e.target.value);
                  setProfilePickerOpen(true);
                }}
                onFocus={() => setProfilePickerOpen(true)}
                onBlur={() => {
                  window.setTimeout(() => setProfilePickerOpen(false), 120);
                }}
                placeholder="Type name or id…"
                className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                aria-autocomplete="list"
                aria-expanded={profilePickerOpen}
                aria-controls="profile-picker-list"
              />
              {selectedListItem && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Selected: {selectedListItem.name} (#{selectedListItem.id})
                </p>
              )}
              {profilePickerOpen && filteredProfileItems.length > 0 && (
                <ul
                  id="profile-picker-list"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
                >
                  {filteredProfileItems.map((item) => (
                    <li key={item.id} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={item.id === selectedId}
                        className="w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedId(item.id);
                          setProfileSearch('');
                          setProfilePickerOpen(false);
                        }}
                      >
                        <span className="font-medium">{item.name}</span>{' '}
                        <span className="text-zinc-500 dark:text-zinc-400">
                          (#{item.id})
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {selectedId && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={analyzeSelectedProfile}
                disabled={analyzing || profileLoading}
                className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
              >
                {analyzing ? 'Analyzing…' : 'Analyze selected profile'}
              </button>
              <Link
                href={`/profiles?profileId=${encodeURIComponent(selectedId)}`}
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Open profile route
              </Link>
              <a
                href={`${API_ORIGIN}/api/v1/profiles/${encodeURIComponent(selectedId)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Go to profile API URL
              </a>
            </div>
          )}
          {selectedId && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              URL: {`${API_ORIGIN}/api/v1/profiles/${selectedId}`}
            </p>
          )}
          {analyzeMessage && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{analyzeMessage}</p>
          )}
        </div>

        {profileError && (
          <div
            className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {profileError}
          </div>
        )}

        {profileLoading && selectedId && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
        )}

        {profile && !profileLoading && (
          <ProfileDetailPanel profile={profile} legacyChipsUx={legacyChipsUx} />
        )}
      </div>
    </div>
  );
}
