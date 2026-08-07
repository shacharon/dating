'use client';

// Internal English-only — admin tools are not product-localized.
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getCandidateAudit, type CandidateAuditResponse } from '@/lib/admin-match-quality-api';
import { enCopy } from '@/lib/i18n/en';
import { chipToEvidence } from '@/app/dating/me-matches/chip-evidence';

const WINDOW_OPTIONS = [7, 30] as const;
type WindowDays = (typeof WINDOW_OPTIONS)[number];

function truncateId(id: string, max = 24): string {
  if (id.length <= max) {
    return id;
  }
  return `${id.slice(0, max)}…`;
}

function formatSentiment(
  sentiment: CandidateAuditResponse['feedbackSummary']['lastSentiment'],
): string {
  if (!sentiment) {
    return '—';
  }
  return sentiment === 'POSITIVE' ? 'Positive' : 'Negative';
}

export default function AdminMatchQualityCandidatePage() {
  const params = useParams<{ profileId: string }>();
  const profileId = decodeURIComponent(params.profileId ?? '');

  const [windowDays, setWindowDays] = useState<WindowDays>(7);
  const [data, setData] = useState<CandidateAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profileId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await getCandidateAudit(profileId, windowDays);
      setData(res);
    } catch (e) {
      if (e instanceof Error && e.message === 'admin_forbidden') {
        setError('You are not authorized to view match quality.');
      } else if (e instanceof Error && e.message === 'candidate_not_found') {
        setError('Candidate profile not found.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load candidate audit');
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [profileId, windowDays]);

  useEffect(() => {
    void load();
  }, [load]);

  const chips = data?.audit?.explainability?.positiveChips?.slice(0, 5) ?? [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="mb-4">
        <Link
          href="/admin/match-quality"
          className="text-sm text-emerald-700 hover:text-emerald-800 dark:text-emerald-400"
        >
          ← Match quality
        </Link>
      </p>
      <h1 className="mb-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
        Candidate audit
      </h1>
      <p
        className="mb-6 font-mono text-sm text-zinc-600 dark:text-zinc-400"
        title={profileId}
      >
        {truncateId(profileId)}
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {WINDOW_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            className={`rounded px-3 py-1.5 text-xs font-medium ${
              windowDays === days
                ? 'bg-emerald-700 text-white'
                : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-900/50'
            }`}
            onClick={() => setWindowDays(days)}
            disabled={loading}
          >
            {days} days
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading candidate audit…</p>
      ) : null}
      {error ? (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && data ? (
        <>
          <p className="mb-4 text-xs text-zinc-500">
            Feedback window: last {data.windowDays} days
          </p>
          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Negative feedback</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {data.feedbackSummary.negativeCount}
              </p>
            </div>
            <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Positive feedback</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {data.feedbackSummary.positiveCount}
              </p>
            </div>
            <div className="rounded border border-zinc-200 p-4 dark:border-zinc-700">
              <p className="text-xs font-medium text-zinc-500">Last sentiment</p>
              <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {formatSentiment(data.feedbackSummary.lastSentiment)}
              </p>
            </div>
          </div>

          {data.auditUnavailable ? (
            <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
              <p className="font-medium">Audit unavailable</p>
              <p className="mt-2">{data.auditUnavailable.message}</p>
              <p className="mt-2 text-xs">
                CLI fallback:{' '}
                <code>
                  scripts/match-quality-audit.ts --viewer-user-id {data.viewerUserId}{' '}
                  --candidate-profile-id {data.candidateProfileId}
                </code>
              </p>
            </div>
          ) : null}

          {data.audit ? (
            <div className="space-y-4 rounded border border-zinc-200 p-4 text-sm dark:border-zinc-700">
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Viewer user:
                </span>{' '}
                <span className="font-mono">{data.audit.viewer.userId}</span>
              </p>
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Outcome:
                </span>{' '}
                {data.audit.compare.outcome}
              </p>
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Match score:
                </span>{' '}
                {data.audit.matchScore ?? '—'}
              </p>
              {chips.length > 0 ? (
                <div>
                  <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">
                    Top chips
                  </p>
                  <ul className="list-inside list-disc text-zinc-600 dark:text-zinc-400">
                    {chips.map((chip) => (
                      <li key={chip}>
                        {chipToEvidence(chip, enCopy.matches.list.browse.chipEvidence)}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {data.audit.recommendation ? (
                <>
                  <p>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Primary takeaway:
                    </span>{' '}
                    {data.audit.recommendation.primaryTakeaway}
                  </p>
                  <p>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                      Suggested next action:
                    </span>{' '}
                    {data.audit.recommendation.suggestedNextAction}
                  </p>
                </>
              ) : null}
              {data.audit.holyGrailEligibility ? (
                <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-700">
                  <p className="mb-2 font-medium text-zinc-700 dark:text-zinc-300">
                    Dealbreaker eligibility (viewer → candidate)
                  </p>
                  <p className="mb-2 text-xs text-zinc-500">
                    Overall:{' '}
                    {data.audit.holyGrailEligibility.overallHardEligibility}
                  </p>
                  {data.audit.holyGrailEligibility.dealbreakerDimensions
                    .length === 0 ? (
                    <p className="text-xs text-zinc-500">No hard dealbreaker dimensions.</p>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-zinc-500">
                          <th className="py-1 pr-2">Tag</th>
                          <th className="py-1 pr-2">Result</th>
                          <th className="py-1 pr-2">Class</th>
                          <th className="py-1 pr-2">Confidence</th>
                          <th className="py-1">Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.audit.holyGrailEligibility.dealbreakerDimensions.map(
                          (row) => (
                            <tr
                              key={`${row.tag}-${row.reasonCode}`}
                              className="align-top text-zinc-700 dark:text-zinc-300"
                            >
                              <td className="py-1 pr-2 font-mono">{row.tag}</td>
                              <td className="py-1 pr-2">{row.result}</td>
                              <td className="py-1 pr-2">{row.classification}</td>
                              <td className="py-1 pr-2">{row.confidence}</td>
                              <td className="py-1">{row.evidence}</td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-6 text-xs text-zinc-500">
            <a
              href={`/dating/me-matches/${encodeURIComponent(profileId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 underline dark:text-emerald-400"
            >
              Open in app (your session)
            </a>
            {' — '}
            shows this candidate only if it appears in your own match list (not
            impersonation).
          </p>
        </>
      ) : null}
    </main>
  );
}
