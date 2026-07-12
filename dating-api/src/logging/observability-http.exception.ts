import { HttpException } from '@nestjs/common';

const OBS_LOGGED = '__datingApiObservabilityLogged' as const;

/**
 * Marks an {@link HttpException} so the global observability filter skips duplicate 500 logs.
 */
export function markHttpExceptionObservabilityLogged(ex: HttpException): void {
  (ex as unknown as Record<string, boolean>)[OBS_LOGGED] = true;
}

export function isHttpExceptionObservabilityLogged(ex: HttpException): boolean {
  return Boolean((ex as unknown as Record<string, boolean>)[OBS_LOGGED]);
}
