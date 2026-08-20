'use client';

import { useEffect } from 'react';
import { RouteError } from '@/components/errors';
import { useAppLocale } from '@/lib/i18n/use-app-locale';
import { emitProductLog, getObservabilityRoute } from '@/lib/observability/product-logger';
import { UiErrorCodes } from '@/lib/observability/ui-error-codes';

export default function DatingError({
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
      message: 'dating_route_error',
      errorCode: UiErrorCodes.DATING_ROUTE_ERROR,
      meta: {
        error: error.message,
        digest: error.digest,
        stack: error.stack?.substring(0, 500),
      },
    });
  }, [error]);

  return (
    <RouteError
      title={copy.error.dating.title}
      message={copy.error.dating.message}
      retryLabel={copy.error.retry}
      onRetry={reset}
    />
  );
}
