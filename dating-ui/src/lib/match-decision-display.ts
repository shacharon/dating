/**
 * Internal tools only — display mapping for the /matches decision hero.
 * Does not change engine scoring; UI-only cue labels and primary-reason copy.
 */

import type { MatchDecisionV1 } from '@/lib/decision-engine-v1';

export type DecisionCueV1 = 'TALK' | 'THINK' | 'SKIP';

export function mapEngineDecisionToCue(d: MatchDecisionV1): DecisionCueV1 {
  if (d === 'STRONG_MATCH') return 'TALK';
  if (d === 'GOOD_MATCH') return 'THINK';
  return 'SKIP';
}

/** Main hero line (THINK → SLOW DOWN in UI only). */
export const HERO_MAIN_LINE: Record<DecisionCueV1, string> = {
  TALK: 'TALK',
  THINK: 'SLOW DOWN',
  SKIP: 'SKIP',
};

export const HERO_GLOSS: Record<DecisionCueV1, string> = {
  TALK: 'Worth meeting',
  THINK: 'Mixed signals',
  SKIP: 'Low fit',
};

/**
 * UI-only friendlier copy for generic engine tier fallbacks (engine strings unchanged).
 * Keys must match `pickPrimaryReason` in decision-engine-v1.ts.
 */
export const PRIMARY_REASON_DISPLAY_FALLBACKS: Record<string, string> = {
  'Compatibility reading is strong overall.':
    'Score is high and several profile signals line up—worth a real conversation.',
  'Compatibility reading is solid overall.':
    'Score is healthy; still scan dealbreakers and day-to-day fit before you invest.',
  'Compatibility reading is only partial.':
    'Score is so-so—some overlap, but you will be negotiating real gaps.',
  'Compatibility reading is below the bar.':
    'Score is low enough that this is unlikely to feel easy or mutual.',
};

export function displayPrimaryReasonForUi(raw: string): string {
  return PRIMARY_REASON_DISPLAY_FALLBACKS[raw] ?? raw;
}

/** Outer CTA shell; inner main + gloss. Tighter tracking on mobile. */
export function matchDecisionCtaShellClass(cue: DecisionCueV1): string {
  const shell =
    'mx-auto flex w-full max-w-lg select-none flex-col items-center justify-center gap-1 rounded-2xl px-6 py-4 text-center sm:px-10 sm:py-6';
  if (cue === 'TALK') {
    return `${shell} bg-zinc-900 text-white shadow-lg ring-2 ring-zinc-900 ring-offset-2 ring-offset-white dark:bg-zinc-100 dark:text-zinc-900 dark:ring-zinc-100 dark:ring-offset-zinc-900`;
  }
  if (cue === 'THINK') {
    return `${shell} border-2 border-zinc-900 bg-white text-zinc-900 shadow-md dark:border-zinc-200 dark:bg-zinc-950 dark:text-zinc-50`;
  }
  return `${shell} border border-zinc-300 bg-transparent py-3.5 text-zinc-500 shadow-none dark:border-zinc-600 dark:text-zinc-500`;
}

export function matchDecisionMainLineClass(cue: DecisionCueV1): string {
  const tight = 'font-extrabold uppercase tracking-wide sm:tracking-wider';
  if (cue === 'TALK') {
    return `${tight} text-3xl sm:text-5xl`;
  }
  if (cue === 'THINK') {
    return `${tight} text-2xl leading-tight sm:text-4xl`;
  }
  return `${tight} text-2xl font-bold sm:text-4xl`;
}

export function matchDecisionGlossClass(cue: DecisionCueV1): string {
  const base = 'text-sm font-semibold leading-tight sm:text-base';
  if (cue === 'TALK') {
    return `${base} text-zinc-200 dark:text-zinc-600`;
  }
  if (cue === 'THINK') {
    return `${base} text-zinc-600 dark:text-zinc-400`;
  }
  return `${base} text-zinc-500 dark:text-zinc-500`;
}
