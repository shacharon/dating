'use client';

import { useEffect, useState } from 'react';
import { useAppLocale } from '@/lib/i18n';
import { createUserReport } from '@/lib/report-user-api';
import {
  USER_REPORT_REASON_VALUES,
  type UserReportContextType,
  type UserReportReason,
} from '@/lib/report-user-options';

const MAX_DETAILS_LENGTH = 1000;

export function ReportUserDialog({
  open,
  onClose,
  contextType,
  contextId,
  subjectLabel,
}: {
  open: boolean;
  onClose: () => void;
  contextType: UserReportContextType;
  contextId: string;
  subjectLabel: string;
}) {
  const { copy } = useAppLocale();
  const [reason, setReason] = useState<UserReportReason>('HARASSMENT');
  const [details, setDetails] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const ru = copy.reportUser;

  useEffect(() => {
    if (!open) {
      setReason('HARASSMENT');
      setDetails('');
      setConfirmOpen(false);
      setSubmitting(false);
      setError(null);
      setSuccess(false);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const reasonLabel = ru.reasons[reason];

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await createUserReport({
        reason,
        details: details.trim() ? details.trim().slice(0, MAX_DETAILS_LENGTH) : null,
        contextType,
        contextId,
      });
      setSuccess(true);
      setConfirmOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : ru.saveError;
      setError(msg === 'report_duplicate' ? ru.duplicateError : ru.saveError);
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-labelledby="report-user-title"
        data-testid="report-user-dialog"
      >
        <h2
          id="report-user-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          {ru.title}
        </h2>

        {success ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
              <span data-testid="report-user-success">{ru.success}</span>
            </p>
            <button
              type="button"
              data-testid="report-user-close"
              onClick={onClose}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              {ru.close}
            </button>
          </div>
        ) : confirmOpen ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {ru.confirm(subjectLabel, reasonLabel)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {ru.cancel}
              </button>
              <button
                type="button"
                data-testid="report-user-submit"
                onClick={() => void handleSubmit()}
                disabled={submitting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? copy.common.loading : ru.submit}
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-4 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              setConfirmOpen(true);
            }}
          >
            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{ru.reasonLabel}</span>
              <select
                data-testid="report-user-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as UserReportReason)}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              >
                {USER_REPORT_REASON_VALUES.map((v) => (
                  <option key={v} value={v}>
                    {ru.reasons[v]}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="text-zinc-600 dark:text-zinc-400">{ru.detailsLabel}</span>
              <textarea
                data-testid="report-user-details"
                value={details}
                maxLength={MAX_DETAILS_LENGTH}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={ru.detailsPlaceholder}
                rows={4}
                className="mt-1 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              />
              <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                {ru.detailsHelp}
              </span>
            </label>

            {error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                {ru.cancel}
              </button>
              <button
                type="submit"
                data-testid="report-user-continue"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                {ru.continue}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
