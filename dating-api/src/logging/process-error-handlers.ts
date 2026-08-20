import { ErrorCodes } from './error-codes';
import type { StructuredObservabilityService } from './structured-observability.service';
import type { SentryBridgeService } from '../observability/sentry-bridge.service';

export type ProcessErrorHandlerDeps = {
  obs: Pick<StructuredObservabilityService, 'fatal'>;
  sentry: Pick<SentryBridgeService, 'captureException'>;
};

let registered = false;

/**
 * Registers Node process-level handlers for uncaught exceptions and unhandled
 * rejections. Idempotent — safe if called twice (tests / hot reload).
 */
export function registerProcessErrorHandlers(
  deps: ProcessErrorHandlerDeps,
): void {
  if (registered) {
    return;
  }
  registered = true;

  const { obs, sentry } = deps;

  process.on('uncaughtException', (err: Error) => {
    try {
      const message =
        err instanceof Error && err.message
          ? `Uncaught exception: ${err.message}`
          : 'Uncaught exception';
      obs.fatal(message, ErrorCodes.PROCESS_UNCAUGHT_EXCEPTION, err);
      sentry.captureException(err, {
        errorCode: ErrorCodes.PROCESS_UNCAUGHT_EXCEPTION,
        tags: { subsystem: 'process' },
      });
    } catch (handlerErr: unknown) {
      console.error('process-error-handlers: uncaughtException handler failed', handlerErr);
      console.error('process-error-handlers: original uncaughtException', err);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    try {
      const message =
        reason instanceof Error && reason.message
          ? `Unhandled promise rejection: ${reason.message}`
          : 'Unhandled promise rejection';
      obs.fatal(message, ErrorCodes.PROCESS_UNHANDLED_REJECTION, reason);
      sentry.captureException(reason, {
        errorCode: ErrorCodes.PROCESS_UNHANDLED_REJECTION,
        tags: { subsystem: 'process' },
      });
    } catch (handlerErr: unknown) {
      console.error(
        'process-error-handlers: unhandledRejection handler failed',
        handlerErr,
      );
      console.error(
        'process-error-handlers: original unhandledRejection',
        reason,
      );
    }
  });
}

/** Test-only: reset idempotency flag between cases. */
export function resetProcessErrorHandlersForTests(): void {
  registered = false;
}
