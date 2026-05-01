import { peekRequestId } from './request-id';
import type { UiErrorCode } from './ui-error-codes';

export type ProductLogLevel = 'trace' | 'error' | 'fatal';

export type ProductLogLine = {
  timestamp: string;
  level: ProductLogLevel;
  service: 'dating-ui';
  env: string;
  requestId: string | null;
  route: string;
  message: string;
  errorCode?: UiErrorCode;
  meta?: Record<string, unknown>;
};

/** Call-site input: `requestId` defaults from last API response when omitted. */
export type ProductLogInput = {
  level: ProductLogLevel;
  route: string;
  message: string;
  errorCode?: UiErrorCode;
  meta?: Record<string, unknown>;
  timestamp?: string;
  service?: 'dating-ui';
  env?: string;
  /** Omit to use {@link peekRequestId}; pass `null` to force null in the line. */
  requestId?: string | null;
};

function defaultEnv(): string {
  return (
    (typeof process !== 'undefined' && process.env.NODE_ENV) ||
    'development'
  );
}

export function getObservabilityRoute(): string {
  if (typeof window === 'undefined') {
    return '(ssr)';
  }
  return window.location.pathname || '/';
}

export function buildProductLogLine(partial: ProductLogInput): ProductLogLine {
  const rid =
    partial.requestId !== undefined ? partial.requestId : peekRequestId();
  return {
    timestamp: partial.timestamp ?? new Date().toISOString(),
    level: partial.level,
    service: partial.service ?? 'dating-ui',
    env: partial.env ?? defaultEnv(),
    requestId: rid,
    route: partial.route,
    message: partial.message,
    ...(partial.errorCode ? { errorCode: partial.errorCode } : {}),
    ...(partial.meta && Object.keys(partial.meta).length
      ? { meta: partial.meta }
      : {}),
  };
}

/**
 * Single structured JSON line to the browser console (local dev primary sink).
 */
export function emitProductLog(partial: ProductLogInput): void {
  const line = buildProductLogLine(partial);
  const payload = JSON.stringify(line);
  if (line.level === 'trace') {
    console.log(payload);
  } else {
    console.error(payload);
  }
}
