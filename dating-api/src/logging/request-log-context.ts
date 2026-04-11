import { AsyncLocalStorage } from 'node:async_hooks';

export type RequestLogFields = {
  requestId: string;
  method: string;
  route: string;
  userId: string | null;
  sessionId: string | null;
};

const als = new AsyncLocalStorage<RequestLogFields>();

export function getRequestLogFields(): RequestLogFields | undefined {
  return als.getStore();
}

export function runWithRequestLogContext<T>(
  store: RequestLogFields,
  fn: () => T,
): T {
  return als.run(store, fn);
}

export function mergeRequestLogContext(patch: Partial<RequestLogFields>): void {
  const s = als.getStore();
  if (!s) {
    return;
  }
  Object.assign(s, patch);
}
