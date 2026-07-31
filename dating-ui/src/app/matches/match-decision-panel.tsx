'use client';

import { useState } from 'react';
import type { DecisionEngineV1Result } from '@/lib/decision-engine-v1';
import {
  displayPrimaryReasonForUi,
  HERO_GLOSS,
  HERO_MAIN_LINE,
  mapEngineDecisionToCue,
  matchDecisionCtaShellClass,
  matchDecisionGlossClass,
  matchDecisionMainLineClass,
} from '@/lib/match-decision-display';

/** Decision hero CTA for the internal /matches tool. */
export function MatchDecisionPanel({ engine }: { engine: DecisionEngineV1Result }) {
  const cue = mapEngineDecisionToCue(engine.decision);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const primaryShown = displayPrimaryReasonForUi(engine.primaryReason);

  return (
    <div
      className="rounded-2xl border border-zinc-200 bg-white p-7 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8"
      role="region"
      aria-label="Match decision"
      data-decision-cue={cue}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className={matchDecisionCtaShellClass(cue)}
          role="status"
          aria-live="polite"
        >
          <span className={matchDecisionMainLineClass(cue)}>{HERO_MAIN_LINE[cue]}</span>
          <span className={matchDecisionGlossClass(cue)}>{HERO_GLOSS[cue]}</span>
        </div>
        <p
          className="mt-5 max-w-xl text-base font-semibold leading-snug text-zinc-600 dark:text-zinc-400 sm:text-lg line-clamp-2"
          title={primaryShown}
        >
          {primaryShown}
        </p>
        {engine.flags.length > 0 ? (
          <div className="mt-4 w-full max-w-xl">
            <button
              type="button"
              onClick={() => setDetailsOpen((o) => !o)}
              className="text-sm font-medium text-zinc-600 underline decoration-zinc-400 underline-offset-2 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              aria-expanded={detailsOpen}
            >
              {detailsOpen ? 'Hide details' : 'Show details'}
            </button>
            {detailsOpen ? (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {engine.flags.map((f) => (
                  <span
                    key={f}
                    className="rounded-md bg-zinc-100 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  >
                    {f}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
