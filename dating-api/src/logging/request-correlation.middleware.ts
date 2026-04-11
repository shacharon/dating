import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { mergeRequestLogContext, runWithRequestLogContext } from './request-log-context';

const HEADER = 'x-request-id';

function readIncomingRequestId(req: Request): string | undefined {
  const raw = req.headers[HEADER];
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().slice(0, 256);
  }
  if (Array.isArray(raw) && raw[0]?.trim()) {
    return raw[0].trim().slice(0, 256);
  }
  return undefined;
}

function normalizeRoute(req: Request): string {
  const u = req.originalUrl ?? req.url ?? '';
  const pathOnly = u.split('?')[0] ?? u;
  return pathOnly || '/';
}

/**
 * Correlates logs for one HTTP request: generates or honors `x-request-id`,
 * binds {@link runWithRequestLogContext}, and echoes the id on the response.
 */
export function requestCorrelationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = readIncomingRequestId(req) ?? randomUUID();
  const method = (req.method ?? 'GET').toUpperCase();
  const route = normalizeRoute(req);

  res.setHeader(HEADER, requestId);

  runWithRequestLogContext(
    {
      requestId,
      method,
      route,
      userId: null,
      sessionId: null,
    },
    () => next(),
  );
}

/**
 * Refresh route/method from the live request (e.g. after internal rewrites).
 */
export function refreshRequestLogRouteFromRequest(req: Request): void {
  mergeRequestLogContext({
    method: (req.method ?? 'GET').toUpperCase(),
    route: normalizeRoute(req),
  });
}
