'use client';

import type { MatchDecisionInsightsV1 } from '@/lib/decision-layer-v1';
import type { DecisionEngineV1Result } from '@/lib/decision-engine-v1';
import type { CompareResult } from '@/lib/matches-api';
import { MatchDecisionPanel } from './match-decision-panel';

type MatchResultPanelProps = {
  result: CompareResult;
  engineV1: DecisionEngineV1Result | null;
  decisionLayer: MatchDecisionInsightsV1 | null;
  decisionLoading: boolean;
};

export function MatchResultPanel({
  result,
  engineV1,
  decisionLayer,
  decisionLoading,
}: MatchResultPanelProps) {
  return (
    <div className="space-y-4">
      {result.status !== 'NOT_ANALYZED' && engineV1 && !decisionLoading ? (
        <MatchDecisionPanel engine={engineV1} />
      ) : null}

      {result.status === 'NOT_ANALYZED' && (
        <div
          className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
          role="status"
        >
          {result.message ?? 'Run analyze for both profiles before compare'}
        </div>
      )}
      {(decisionLoading ||
        Boolean(decisionLayer?.whyThisWorks || decisionLayer?.watchOutFor)) && (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Decide faster
          </h2>
          {decisionLoading ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading cues…</p>
          ) : (
            <dl className="space-y-3 text-sm">
              {decisionLayer?.whyThisWorks ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                    Why this works
                  </dt>
                  <dd className="mt-1 font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                    {decisionLayer.whyThisWorks}
                  </dd>
                </div>
              ) : null}
              {decisionLayer?.watchOutFor ? (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Watch out for
                  </dt>
                  <dd className="mt-1 font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                    {decisionLayer.watchOutFor}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}
        </div>
      )}

      <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
        <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Score
        </h2>
        <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100" data-score-source="api">
          {result.status === 'NOT_ANALYZED' ? '—' : result.finalScore}
        </p>
        {result.status !== 'NOT_ANALYZED' && (
          <ul className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">A → B</span>
              <span className="font-medium">{result.aToB}</span>
            </li>
            <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">B → A</span>
              <span className="font-medium">{result.bToA}</span>
            </li>
            <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">Relationship</span>
              <span className="font-medium">{result.relationshipStyle}</span>
            </li>
            <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">Coverage %</span>
              <span className="font-medium">{result.coveragePercent ?? result.coverage}</span>
            </li>
            <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
              <span className="text-zinc-600 dark:text-zinc-400">
                {result.friction != null ? 'Friction (0–10)' : 'Friction risk'}
              </span>
              <span className="font-medium">{result.friction ?? result.frictionRisk}</span>
            </li>
            {result.compatibility != null && (
              <li className="flex justify-between rounded bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                <span className="text-zinc-600 dark:text-zinc-400">Compatibility</span>
                <span className="font-medium">{result.compatibility}</span>
              </li>
            )}
          </ul>
        )}
      </div>

      {result.status !== 'NOT_ANALYZED' && (result.alignments?.length ?? 0) > 0 && (
        <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Why it works
          </h2>
          <ul className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            {(result.alignments ?? []).map((a, i) => (
              <li key={i}>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {a.key}
                </span>{' '}
                (score {a.pairScore})
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.status !== 'NOT_ANALYZED' && (result.tensions?.length ?? 0) > 0 && (
        <div className="rounded border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Tensions
          </h2>
          <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            {(result.tensions ?? []).map((t, i) => (
              <li key={i}>
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {t.key}
                </span>{' '}
                — Gap ({t.gap}). {t.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result.status !== 'NOT_ANALYZED' &&
        (result.alignments?.length ?? 0) === 0 &&
        (result.tensions?.length ?? 0) === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No alignments or tensions to show.
          </p>
        )}
    </div>
  );
}
