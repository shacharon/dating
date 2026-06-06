import { Injectable } from '@nestjs/common';
import * as Sentry from '@sentry/node';
import { getRequestLogFields } from '../logging/request-log-context';
import { SentryConfigService } from './sentry-config.service';

export type SentryCaptureContext = {
  errorCode?: string;
  tags?: Record<string, string>;
  level?: 'error' | 'warning' | 'info';
};

@Injectable()
export class SentryBridgeService {
  constructor(private readonly cfg: SentryConfigService) {}

  captureException(error: unknown, context?: SentryCaptureContext): void {
    if (!this.cfg.isEnabled) {
      return;
    }

    Sentry.withScope((scope) => {
      this.applyContext(scope, context);
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureException(new Error(String(error)));
      }
    });
  }

  captureMessage(message: string, context?: SentryCaptureContext): void {
    if (!this.cfg.isEnabled) {
      return;
    }

    Sentry.withScope((scope) => {
      this.applyContext(scope, context);
      const level = context?.level ?? 'warning';
      Sentry.captureMessage(message, level);
    });
  }

  private applyContext(
    scope: Sentry.Scope,
    context?: SentryCaptureContext,
  ): void {
    const log = getRequestLogFields();
    if (log?.requestId) {
      scope.setTag('requestId', log.requestId);
    }
    if (log?.userId) {
      scope.setUser({ id: log.userId });
    }
    if (context?.errorCode) {
      scope.setTag('errorCode', context.errorCode);
    }
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.level) {
      scope.setLevel(context.level);
    }
  }
}
