'use client';

import { mapEvaluationToViewModel } from '@/lib/analysis-presentation';
import { AnalysisProgressPanel } from '@/components/analysis-progress-panel';
import { useAppLocale } from '@/lib/i18n';
import { AnalysisResultsView } from './analysis-results-view';
import { useAnalysisPage } from './use-analysis-page';

export default function DatingAnalysisPage() {
  const { locale, copy } = useAppLocale();
  const pageCopy = copy.analysisPage;
  const {
    data,
    profile,
    error,
    loading,
    reAnalyzeSubmitting,
    pollEnabled,
    redirecting,
    waitingPanel,
    showResults,
    analysisFailed,
    onReAnalyze,
  } = useAnalysisPage(pageCopy.loadFailed);

  const vm = mapEvaluationToViewModel(data?.evaluationJson ?? null);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-10">
        {loading && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500" role="status">
            {pageCopy.loading}
          </p>
        )}

        {!loading && error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400"
            role="alert"
          >
            {pageCopy.loadFailed} {pageCopy.loadFailedHint}
          </div>
        )}

        {!loading && !error && waitingPanel && (
          <AnalysisProgressPanel
            profileStatus={profile?.status}
            failed={analysisFailed}
            redirecting={redirecting}
            onRetry={() => void onReAnalyze()}
          />
        )}

        {!loading && !error && showResults && data && (
          <AnalysisResultsView
            data={data}
            profile={profile}
            vm={vm}
            pageCopy={pageCopy}
            locale={locale}
            reAnalyzeSubmitting={reAnalyzeSubmitting}
            pollEnabled={pollEnabled}
            onReAnalyze={() => void onReAnalyze()}
          />
        )}
      </div>
    </div>
  );
}
