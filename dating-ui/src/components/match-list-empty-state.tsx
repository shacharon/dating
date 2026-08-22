'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAppLocale } from '@/lib/i18n';
import { buildInviteUrl } from '@/lib/referral-attribution';
import { useProfile } from '@/hooks/use-profile';

export function MatchListEmptyState() {
  const { user } = useAuth();
  const { copy: appCopy } = useAppLocale();
  const { profile } = useProfile();
  const [inviteCopied, setInviteCopied] = useState(false);

  const copy = appCopy.launch.emptyMatches;

  const place = useMemo(() => {
    if (!profile) return null;
    return (
      profile.locationLabel?.trim() ||
      profile.city?.trim() ||
      null
    );
  }, [profile]);

  async function onCopyInviteLink() {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url =
      user?.id && origin
        ? buildInviteUrl(origin, user.id)
        : origin
          ? `${origin}/`
          : '/';
    try {
      await navigator.clipboard.writeText(url);
      setInviteCopied(true);
    } catch {
      setInviteCopied(false);
    }
  }

  const body = place ? copy.bodyWithPlace(place) : copy.bodyGeneric;

  return (
    <div
      data-testid="match-list-empty-state"
      className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-900"
      role="status"
    >
      <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
        {copy.title}
      </p>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{body}</p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        {copy.filterHint}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/settings/preferences"
          data-testid="match-empty-edit-preferences"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {copy.editPreferences}
        </Link>
        <Link
          href="/profile"
          data-testid="match-empty-edit-profile"
          className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
        >
          {copy.editProfile}
        </Link>
        <button
          type="button"
          data-testid="match-empty-invite-copy"
          onClick={() => void onCopyInviteLink()}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {copy.inviteCopyLink}
        </button>
      </div>
      {inviteCopied ? (
        <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400" role="status">
          {copy.inviteCopied}
        </p>
      ) : null}
    </div>
  );
}
