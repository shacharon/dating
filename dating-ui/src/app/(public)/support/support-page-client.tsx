'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent } from 'react';
import { useAppLocale } from '@/lib/i18n';
import {
  buildSupportMailto,
  getSupportOpsEmail,
  type SupportIssueType,
} from '@/lib/support-mailto';

const ISSUE_KEYS: SupportIssueType[] = [
  'matches',
  'photo',
  'conversation',
  'bug',
  'feature',
  'other',
];

export default function SupportPageClient() {
  const { copy } = useAppLocale();
  const s = copy.support;
  const opsEmail = useMemo(() => getSupportOpsEmail(), []);
  const [issueType, setIssueType] = useState<SupportIssueType>('matches');
  const [description, setDescription] = useState('');
  const [replyEmail, setReplyEmail] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!opsEmail) return;
    const href = buildSupportMailto({
      to: opsEmail,
      issueTypeLabel: s.issueTypes[issueType],
      description,
      replyEmail,
    });
    window.location.href = href;
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <p className="mb-4">
        <Link
          href="/"
          className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← {copy.landing.brand}
        </Link>
      </p>
      <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        {s.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{s.subtitle}</p>
      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-500">{s.slaHint}</p>

      {!opsEmail ? (
        <p
          className="mt-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
          data-testid="support-missing-email"
        >
          {s.missingEmailConfig}
        </p>
      ) : (
        <form
          className="mt-8 space-y-5"
          onSubmit={onSubmit}
          data-testid="support-form"
        >
          <label className="block text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {s.issueTypeLabel}
            </span>
            <select
              data-testid="support-issue-type"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={issueType}
              onChange={(e) =>
                setIssueType(e.target.value as SupportIssueType)
              }
            >
              {ISSUE_KEYS.map((key) => (
                <option key={key} value={key}>
                  {s.issueTypes[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {s.descriptionLabel}
            </span>
            <textarea
              data-testid="support-description"
              required
              rows={5}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={s.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">
              {s.emailLabel}
            </span>
            <input
              data-testid="support-reply-email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              placeholder={s.emailPlaceholder}
              value={replyEmail}
              onChange={(e) => setReplyEmail(e.target.value)}
            />
          </label>

          <p className="text-xs text-zinc-500 dark:text-zinc-500">{s.mailtoHint}</p>

          <button
            type="submit"
            data-testid="support-submit"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            {s.submit}
          </button>
        </form>
      )}
    </main>
  );
}
