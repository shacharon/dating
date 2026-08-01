'use client';

import { useId, useState } from 'react';
import type { OnboardingWritingPromptField } from '@/lib/i18n/types';

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export type OnboardingTextFieldHelpChrome = {
  ideasHeading: string;
  showExamples: string;
  hideExamples: string;
  showTips: string;
  hideTips: string;
  exampleLabel: (n: number) => string;
  includeHeading: string;
  avoidHeading: string;
  toneHeading: string;
  wordCountLine: (words: number) => string;
};

export type OnboardingTextFieldHelpProps = {
  value: string;
  field: OnboardingWritingPromptField;
  chrome: OnboardingTextFieldHelpChrome;
  testIdPrefix: string;
};

/**
 * Writing-prompt help for onboarding/profile text fields (examples, tips, word count).
 */
export function OnboardingTextFieldHelp({
  value,
  field,
  chrome,
  testIdPrefix,
}: OnboardingTextFieldHelpProps) {
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const words = countWords(value);
  const examplesPanelId = useId();
  const tipsPanelId = useId();

  const toggleClass =
    'text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100';

  return (
    <div
      className="mt-2 space-y-3"
      data-testid={`${testIdPrefix}-writing-help`}
    >
      <p
        className="text-xs text-zinc-500 dark:text-zinc-400"
        data-testid={`${testIdPrefix}-word-count`}
        aria-live="polite"
      >
        {chrome.wordCountLine(words)}
      </p>

      <div data-testid={`${testIdPrefix}-ideas`}>
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {chrome.ideasHeading}
        </p>
        <ul className="mt-1 list-disc space-y-1 ps-5 text-sm text-zinc-600 dark:text-zinc-400">
          {field.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </div>

      <div>
        <button
          type="button"
          className={toggleClass}
          aria-expanded={examplesOpen}
          aria-controls={examplesPanelId}
          data-testid={`${testIdPrefix}-examples-toggle`}
          onClick={() => setExamplesOpen((v) => !v)}
        >
          {examplesOpen ? chrome.hideExamples : chrome.showExamples}
        </button>
        {examplesOpen ? (
          <div
            id={examplesPanelId}
            className="mt-2 space-y-3"
            data-testid={`${testIdPrefix}-examples-panel`}
          >
            {field.examples.map((example, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900/60"
              >
                <p className="font-medium text-zinc-500 dark:text-zinc-400">
                  {chrome.exampleLabel(i + 1)}
                </p>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{example}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div>
        <button
          type="button"
          className={toggleClass}
          aria-expanded={tipsOpen}
          aria-controls={tipsPanelId}
          data-testid={`${testIdPrefix}-tips-toggle`}
          onClick={() => setTipsOpen((v) => !v)}
        >
          {tipsOpen ? chrome.hideTips : chrome.showTips}
        </button>
        {tipsOpen ? (
          <div
            id={tipsPanelId}
            className="mt-2 space-y-3 text-sm text-zinc-600 dark:text-zinc-400"
            data-testid={`${testIdPrefix}-tips-panel`}
          >
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {chrome.includeHeading}
              </p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {field.include.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {chrome.avoidHeading}
              </p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {field.avoid.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {chrome.toneHeading}
              </p>
              <ul className="mt-1 list-disc space-y-1 ps-5">
                {field.tone.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
