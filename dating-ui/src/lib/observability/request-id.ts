const HEADER = 'x-request-id';

/** Last correlation id from an API `Response` (browser / server fetch). */
let lastRequestId: string | null = null;

function readHeader(res: Response): string | undefined {
  const h = res.headers;
  if (typeof h.get === 'function') {
    const v = h.get(HEADER) ?? h.get('X-Request-Id');
    return v?.trim() || undefined;
  }
  return undefined;
}

export function captureRequestIdFromResponse(res: Response): void {
  const id = readHeader(res);
  if (id) {
    lastRequestId = id.slice(0, 256);
  }
}

export function peekRequestId(): string | null {
  return lastRequestId;
}

/** Vitest / isolated modules only. */
export function resetRequestIdContextForTests(): void {
  lastRequestId = null;
}
