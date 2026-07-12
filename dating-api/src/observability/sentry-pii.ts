import type {
  Breadcrumb,
  ErrorEvent,
  EventHint,
} from '@sentry/node';

const SENSITIVE_HEADER_KEYS = new Set([
  'cookie',
  'authorization',
  'set-cookie',
]);

const SENSITIVE_ROUTE_FRAGMENTS = [
  '/messages',
  '/auth',
  '/notifications',
];

const SENSITIVE_EXTRA_KEYS = new Set([
  'body',
  'html',
  'text',
  'htmlbody',
  'textbody',
  'cookie',
  'cookies',
  'to',
  'email',
  'subject',
]);

function redactHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) return headers;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_KEYS.has(key.toLowerCase())) {
      out[key] = '[Filtered]';
    } else {
      out[key] = value;
    }
  }
  return out;
}

function scrubRequestData(event: ErrorEvent): void {
  const req = event.request;
  if (!req) return;

  const url = req.url ?? '';
  if (
    SENSITIVE_ROUTE_FRAGMENTS.some((fragment) => url.includes(fragment))
  ) {
    delete req.data;
  }

  if (req.headers) {
    req.headers = redactHeaders(req.headers as Record<string, string>);
  }
}

function scrubExtras(event: ErrorEvent): void {
  if (!event.extra) return;
  for (const key of Object.keys(event.extra)) {
    if (SENSITIVE_EXTRA_KEYS.has(key.toLowerCase())) {
      event.extra[key] = '[Filtered]';
    }
  }
}

function scrubUser(event: ErrorEvent): void {
  if (!event.user) return;
  delete event.user.email;
  delete event.user.ip_address;
}

/** Drop or redact PII before events leave the process. */
export function sentryBeforeSend(
  event: ErrorEvent,
  _hint: EventHint,
): ErrorEvent | null {
  scrubRequestData(event);
  scrubExtras(event);
  scrubUser(event);
  return event;
}

export function sentryBeforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === 'http' && breadcrumb.data) {
    const data = { ...breadcrumb.data };
    if (typeof data.url === 'string') {
      const url = data.url;
      if (SENSITIVE_ROUTE_FRAGMENTS.some((f) => url.includes(f))) {
        delete data.body;
      }
    }
    breadcrumb.data = data;
  }
  return breadcrumb;
}
