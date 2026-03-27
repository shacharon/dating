'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { getMockMatchById } from '../_lib/mock-matches';

type FeedbackChoice = 'interested' | 'not_interested' | 'not_sure';

const CHOICES: { value: FeedbackChoice; label: string }[] = [
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'not_sure', label: 'Not sure' },
];

export function FeedbackForm() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get('matchId')?.trim() ?? '';

  const [choice, setChoice] = useState<FeedbackChoice | null>(null);
  const [why, setWhy] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const match = useMemo(
    () => (matchId ? getMockMatchById(matchId) : undefined),
    [matchId],
  );

  const backToMatchHref = matchId
    ? `/dating/matches/${encodeURIComponent(matchId)}`
    : '/dating/matches';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!choice) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Thanks for the feedback
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Your response was recorded locally for this preview. Nothing was sent to a server.
            </p>
            <Link
              href={backToMatchHref}
              className="mt-8 inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Back to match
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <div className="mx-auto max-w-lg">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            How do you feel about this match?
          </h1>
          {match ? (
            <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {match.name}
              <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">{match.age}</span>
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Your answer helps us tune future suggestions. This is a local preview only—nothing
            is saved to an account yet.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8"
        >
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Your reaction
            </legend>
            <div className="mt-4 flex flex-col gap-3">
              {CHOICES.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-800 has-[:checked]:border-zinc-900 has-[:checked]:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-200 dark:has-[:checked]:border-zinc-100 dark:has-[:checked]:bg-zinc-800/50"
                >
                  <input
                    type="radio"
                    name="feedback"
                    value={value}
                    checked={choice === value}
                    onChange={() => setChoice(value)}
                    className="h-4 w-4 border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-8">
            <label
              htmlFor="why"
              className="text-sm font-semibold text-zinc-900 dark:text-zinc-100"
            >
              Why? <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
            </label>
            <textarea
              id="why"
              name="why"
              rows={3}
              value={why}
              onChange={(e) => setWhy(e.target.value)}
              placeholder="A few words is enough."
              className="mt-2 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-zinc-100 pt-8 dark:border-zinc-800 sm:flex-row sm:flex-row-reverse sm:justify-between">
            <button
              type="submit"
              disabled={!choice}
              className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Submit feedback
            </button>
            <Link
              href={backToMatchHref}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              Back to match
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
