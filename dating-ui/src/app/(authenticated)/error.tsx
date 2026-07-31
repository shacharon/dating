'use client';

import { useEffect } from 'react';
import { useAppLocale } from '@/lib/i18n/use-app-locale';
import { emitProductLog, getObservabilityRoute } from '@/lib/observability/product-logger';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

export default function AuthenticatedError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { copy } = useAppLocale();

  useEffect(() => {
    emitProductLog({
      level: 'error',
      route: getObservabilityRoute(),
      message: 'authenticated_route_error',
      errorCode: UiErrorCodes.AUTHENTICATED_ROUTE_ERROR,
      meta: {
        error: error.message,
        digest: error.digest,
      },
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-zinc-100">
          {copy.error.authenticated.title}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mb-6">
          {copy.error.authenticated.message}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          {copy.error.retry}
        </button>
      </div>
    </div>
  );
}
