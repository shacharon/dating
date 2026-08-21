'use client';

import { useEffect } from 'react';
import { RouteError } from '@/components/errors';
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
    <RouteError
      title={copy.error.authenticated.title}
      message={copy.error.authenticated.message}
      retryLabel={copy.error.retry}
      onRetry={reset}
    />
  );
}
