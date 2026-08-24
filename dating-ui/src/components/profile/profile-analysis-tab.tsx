'use client';

import dynamic from 'next/dynamic';
import { AnalysisProgressPanel } from '@/components/analysis-progress-panel';
import { mapEvaluationToViewModel } from '@/lib/matches/analysis-presentation';
import { useAppLocale } from '@/lib/i18n';
import { useAnalysisPage } from '@/app/dating/analysis/use-analysis-page';

const AnalysisResultsView = dynamic(
  () =>
    import('@/app/dating/analysis/analysis-results-view').then((m) => ({
      default: m.AnalysisResultsView,
    })),
  { ssr: false },
);

/**
 * Profile hub Analysis tab: progress panel + lazy results view.
 */
export function ProfileAnalysisTab() {
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
    <div className="space-y-8" data-testid="profile-analysis-tab">
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
  );
}
