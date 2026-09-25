'use client';

import { useState } from 'react';
import type { ProfileDraft } from '@/app/dating/_lib/types';
import type { MeLatestAnalysisDto } from '@/lib/api/me-analysis-api';
import type { MeProfileDto } from '@/lib/api-types/profile';
import { useSubmitProfileForAnalysis } from '@/hooks/use-profile';
import { useAppLocale } from '@/lib/i18n';
import { mapEvaluationToViewModel } from '@/lib/matches/analysis-presentation';
import { hasMinimumProfileFacts } from '@/lib/profile/minimum-profile';

function storyWritten(draft: ProfileDraft): boolean {
  const text = [draft.aboutMe, draft.aboutPartner, draft.aboutRelationship]
    .join(' ')
    .trim();
  return text.length >= 40;
}

export function ProfileAnalyzePrompt({
  profile,
  draft,
  analysis,
  onFinished,
}: {
  profile: MeProfileDto | null;
  draft: ProfileDraft;
  analysis: MeLatestAnalysisDto | null;
  onFinished: () => void;
}) {
  const { copy } = useAppLocale();
  const hub = copy.profile.hub;
  const submit = useSubmitProfileForAnalysis();
  const [failed, setFailed] = useState(false);

  const ready = hasMinimumProfileFacts(profile) && storyWritten(draft);
  const highlights = analysis?.evaluationJson
    ? mapEvaluationToViewModel(analysis.evaluationJson).selfHighlights.slice(0, 3)
    : [];
  const hasResult = Boolean(analysis?.evaluationId) && highlights.length > 0;

  async function run() {
    setFailed(false);
    try {
      await submit.mutateAsync();
      onFinished();
    } catch {
      setFailed(true);
    }
  }

  return (
    <section
      className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
      data-testid="profile-analyze-prompt"
    >
      {hasResult ? (
        <>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {hub.analyzeResultTitle}
          </h2>
          <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-zinc-700 dark:text-zinc-300">
            {highlights.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      ) : ready ? (
        <>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {hub.analyzeReadyTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {hub.analyzeReadyBody}
          </p>
          <button
            type="button"
            data-testid="profile-analyze-button"
            disabled={submit.isPending}
            onClick={() => void run()}
            className="mt-3 inline-flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {submit.isPending ? hub.analyzeRunning : hub.analyzeButton}
          </button>
        </>
      ) : (
        <>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {hub.analyzeNeedTitle}
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {hub.analyzeNeedBody}
          </p>
        </>
      )}
      {failed ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {hub.analyzeFailed}
        </p>
      ) : null}
    </section>
  );
}
