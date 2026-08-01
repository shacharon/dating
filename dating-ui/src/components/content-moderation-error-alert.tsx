'use client';

import type { ContentModerationDetails } from '@/lib/content-moderation-error';

export type ContentModerationErrorAlertProps = {
  details: ContentModerationDetails;
  variant: 'profile' | 'message';
  title: string;
  fieldLabel?: string | null;
  labels: {
    fieldLabel: string;
    flaggedLabel: string;
    whyLabel: string;
    suggestionLabel: string;
    exampleLabel: string;
    mutedLabel: string;
    dismiss: string;
  };
  onDismiss?: () => void;
};

export function ContentModerationErrorAlert({
  details,
  variant,
  title,
  fieldLabel,
  labels,
  onDismiss,
}: ContentModerationErrorAlertProps) {
  const showField = variant === 'profile' && Boolean(fieldLabel);

  return (
    <div
      role="alert"
      data-testid="content-moderation-error-alert"
      className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{title}</p>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-xs font-medium text-amber-800 underline-offset-2 hover:underline dark:text-amber-200"
            data-testid="content-moderation-error-dismiss"
          >
            {labels.dismiss}
          </button>
        ) : null}
      </div>

      <dl className="mt-3 space-y-2">
        {showField ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              {labels.fieldLabel}
            </dt>
            <dd className="mt-0.5">{fieldLabel}</dd>
          </div>
        ) : null}

        {details.flaggedText ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              {labels.flaggedLabel}
            </dt>
            <dd className="mt-0.5">
              <q className="break-words">{details.flaggedText}</q>
            </dd>
          </div>
        ) : null}

        {details.reason ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              {labels.whyLabel}
            </dt>
            <dd className="mt-0.5">{details.reason}</dd>
          </div>
        ) : null}

        {details.suggestion ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              {labels.suggestionLabel}
            </dt>
            <dd className="mt-0.5">{details.suggestion}</dd>
          </div>
        ) : null}

        {details.exampleAlternative ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              {labels.exampleLabel}
            </dt>
            <dd className="mt-0.5">{details.exampleAlternative}</dd>
          </div>
        ) : null}

        {details.muted ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-200/80">
              {labels.mutedLabel}
            </dt>
            <dd className="mt-0.5">{details.muted}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
