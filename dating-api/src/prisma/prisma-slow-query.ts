/**
 * Prisma slow-query thresholds, fingerprinting, and enablement (Sprint 40 Story 3).
 * Env overrides documented in docs/ops/PRISMA_SLOW_QUERY.md.
 */

export const PRISMA_SLOW_QUERY_MS_ENV = 'PRISMA_SLOW_QUERY_MS';
export const PRISMA_SLOW_QUERY_MS_DEFAULT = 100;

export const PRISMA_VERY_SLOW_QUERY_MS_ENV = 'PRISMA_VERY_SLOW_QUERY_MS';
export const PRISMA_VERY_SLOW_QUERY_MS_DEFAULT = 1000;

export const PRISMA_SLOW_QUERY_DISABLED_ENV = 'PRISMA_SLOW_QUERY_DISABLED';
export const PRISMA_SLOW_QUERY_FORCE_ENV = 'PRISMA_SLOW_QUERY_FORCE';
export const PRISMA_SLOW_QUERY_INCLUDE_PARAMS_ENV =
  'PRISMA_SLOW_QUERY_INCLUDE_PARAMS';

export const PRISMA_SLOW_QUERY_FINGERPRINT_MAX = 512;
export const PRISMA_SLOW_QUERY_PARAMS_MAX = 256;

export type PrismaSlowQuerySeverity = 'slow' | 'very_slow';

export type PrismaSlowQueryThresholds = {
  slowMs: number;
  verySlowMs: number;
};

export type PrismaQueryEventLike = {
  query: string;
  params?: string;
  duration: number;
  target?: string;
};

export type PrismaSlowQueryPayload = {
  durationMs: number;
  severity: PrismaSlowQuerySeverity;
  query: string;
  target?: string;
  params?: string;
};

function envTruthy(raw: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((raw ?? '').trim().toLowerCase());
}

function resolvePositiveMs(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw == null || String(raw).trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Whether to register Prisma query events and emit slow-query signals. */
export function isPrismaSlowQueryReportingEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (envTruthy(env[PRISMA_SLOW_QUERY_DISABLED_ENV])) return false;
  if (
    env.NODE_ENV === 'test' &&
    !envTruthy(env[PRISMA_SLOW_QUERY_FORCE_ENV])
  ) {
    return false;
  }
  return true;
}

/**
 * Resolve slow / very-slow thresholds.
 * If VERY_SLOW &lt; SLOW, clamp VERY_SLOW to SLOW.
 */
export function resolvePrismaSlowQueryThresholds(
  env: NodeJS.ProcessEnv = process.env,
): PrismaSlowQueryThresholds {
  const slowMs = resolvePositiveMs(
    env[PRISMA_SLOW_QUERY_MS_ENV],
    PRISMA_SLOW_QUERY_MS_DEFAULT,
  );
  let verySlowMs = resolvePositiveMs(
    env[PRISMA_VERY_SLOW_QUERY_MS_ENV],
    PRISMA_VERY_SLOW_QUERY_MS_DEFAULT,
  );
  if (verySlowMs < slowMs) {
    verySlowMs = slowMs;
  }
  return { slowMs, verySlowMs };
}

/** Collapse whitespace and truncate for safe log fingerprint. */
export function fingerprintPrismaQuery(
  query: string,
  maxLen: number = PRISMA_SLOW_QUERY_FINGERPRINT_MAX,
): string {
  const normalized = query.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen)}…`;
}

export function severityForPrismaQueryDuration(
  durationMs: number,
  thresholds: PrismaSlowQueryThresholds,
): PrismaSlowQuerySeverity | null {
  if (!(durationMs >= thresholds.slowMs)) return null;
  if (durationMs >= thresholds.verySlowMs) return 'very_slow';
  return 'slow';
}

/** Params only when explicitly opted in and not production. */
export function shouldIncludePrismaQueryParams(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (env.NODE_ENV === 'production') return false;
  return envTruthy(env[PRISMA_SLOW_QUERY_INCLUDE_PARAMS_ENV]);
}

export function buildPrismaSlowQueryPayload(
  event: PrismaQueryEventLike,
  severity: PrismaSlowQuerySeverity,
  opts?: { includeParams?: boolean },
): PrismaSlowQueryPayload {
  const payload: PrismaSlowQueryPayload = {
    durationMs: event.duration,
    severity,
    query: fingerprintPrismaQuery(event.query),
  };
  if (event.target) {
    payload.target = event.target;
  }
  if (opts?.includeParams && event.params != null) {
    const raw = String(event.params);
    payload.params =
      raw.length <= PRISMA_SLOW_QUERY_PARAMS_MAX
        ? raw
        : `${raw.slice(0, PRISMA_SLOW_QUERY_PARAMS_MAX)}…`;
  }
  return payload;
}
