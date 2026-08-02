import {
  buildPrismaSlowQueryPayload,
  fingerprintPrismaQuery,
  isPrismaSlowQueryReportingEnabled,
  PRISMA_SLOW_QUERY_DISABLED_ENV,
  PRISMA_SLOW_QUERY_FORCE_ENV,
  PRISMA_SLOW_QUERY_INCLUDE_PARAMS_ENV,
  PRISMA_SLOW_QUERY_MS_DEFAULT,
  PRISMA_SLOW_QUERY_MS_ENV,
  PRISMA_VERY_SLOW_QUERY_MS_DEFAULT,
  PRISMA_VERY_SLOW_QUERY_MS_ENV,
  resolvePrismaSlowQueryThresholds,
  severityForPrismaQueryDuration,
  shouldIncludePrismaQueryParams,
} from './prisma-slow-query';

describe('prisma-slow-query', () => {
  describe('isPrismaSlowQueryReportingEnabled', () => {
    it('disables when DISABLED is truthy', () => {
      expect(
        isPrismaSlowQueryReportingEnabled({
          [PRISMA_SLOW_QUERY_DISABLED_ENV]: '1',
          NODE_ENV: 'development',
        }),
      ).toBe(false);
    });

    it('disables in test unless FORCE', () => {
      expect(
        isPrismaSlowQueryReportingEnabled({ NODE_ENV: 'test' }),
      ).toBe(false);
      expect(
        isPrismaSlowQueryReportingEnabled({
          NODE_ENV: 'test',
          [PRISMA_SLOW_QUERY_FORCE_ENV]: 'yes',
        }),
      ).toBe(true);
    });

    it('enables in development and production by default', () => {
      expect(
        isPrismaSlowQueryReportingEnabled({ NODE_ENV: 'development' }),
      ).toBe(true);
      expect(
        isPrismaSlowQueryReportingEnabled({ NODE_ENV: 'production' }),
      ).toBe(true);
      expect(isPrismaSlowQueryReportingEnabled({})).toBe(true);
    });
  });

  describe('resolvePrismaSlowQueryThresholds', () => {
    it('uses defaults when unset', () => {
      expect(resolvePrismaSlowQueryThresholds({})).toEqual({
        slowMs: PRISMA_SLOW_QUERY_MS_DEFAULT,
        verySlowMs: PRISMA_VERY_SLOW_QUERY_MS_DEFAULT,
      });
    });

    it('falls back on invalid values', () => {
      expect(
        resolvePrismaSlowQueryThresholds({
          [PRISMA_SLOW_QUERY_MS_ENV]: '0',
          [PRISMA_VERY_SLOW_QUERY_MS_ENV]: 'nope',
        }),
      ).toEqual({
        slowMs: PRISMA_SLOW_QUERY_MS_DEFAULT,
        verySlowMs: PRISMA_VERY_SLOW_QUERY_MS_DEFAULT,
      });
    });

    it('parses env overrides', () => {
      expect(
        resolvePrismaSlowQueryThresholds({
          [PRISMA_SLOW_QUERY_MS_ENV]: '250',
          [PRISMA_VERY_SLOW_QUERY_MS_ENV]: '2000',
        }),
      ).toEqual({ slowMs: 250, verySlowMs: 2000 });
    });

    it('clamps verySlow when below slow', () => {
      expect(
        resolvePrismaSlowQueryThresholds({
          [PRISMA_SLOW_QUERY_MS_ENV]: '500',
          [PRISMA_VERY_SLOW_QUERY_MS_ENV]: '100',
        }),
      ).toEqual({ slowMs: 500, verySlowMs: 500 });
    });
  });

  describe('fingerprintPrismaQuery', () => {
    it('collapses whitespace', () => {
      expect(fingerprintPrismaQuery('SELECT  *\nFROM  "User"')).toBe(
        'SELECT * FROM "User"',
      );
    });

    it('truncates long queries', () => {
      const long = 'A'.repeat(600);
      const fp = fingerprintPrismaQuery(long, 512);
      expect(fp.length).toBe(513);
      expect(fp.endsWith('…')).toBe(true);
      expect(fp.slice(0, 512)).toBe('A'.repeat(512));
    });
  });

  describe('severityForPrismaQueryDuration', () => {
    const thresholds = { slowMs: 100, verySlowMs: 1000 };

    it('returns null under slow threshold', () => {
      expect(severityForPrismaQueryDuration(99, thresholds)).toBeNull();
    });

    it('returns slow between thresholds', () => {
      expect(severityForPrismaQueryDuration(100, thresholds)).toBe('slow');
      expect(severityForPrismaQueryDuration(999, thresholds)).toBe('slow');
    });

    it('returns very_slow at escalate threshold (once, not both)', () => {
      expect(severityForPrismaQueryDuration(1000, thresholds)).toBe(
        'very_slow',
      );
      expect(severityForPrismaQueryDuration(5000, thresholds)).toBe(
        'very_slow',
      );
    });
  });

  describe('shouldIncludePrismaQueryParams', () => {
    it('never includes in production', () => {
      expect(
        shouldIncludePrismaQueryParams({
          NODE_ENV: 'production',
          [PRISMA_SLOW_QUERY_INCLUDE_PARAMS_ENV]: '1',
        }),
      ).toBe(false);
    });

    it('includes in non-prod only when opted in', () => {
      expect(
        shouldIncludePrismaQueryParams({ NODE_ENV: 'development' }),
      ).toBe(false);
      expect(
        shouldIncludePrismaQueryParams({
          NODE_ENV: 'development',
          [PRISMA_SLOW_QUERY_INCLUDE_PARAMS_ENV]: 'true',
        }),
      ).toBe(true);
    });
  });

  describe('buildPrismaSlowQueryPayload', () => {
    it('fingerprints query and omits params by default', () => {
      expect(
        buildPrismaSlowQueryPayload(
          {
            query: 'SELECT  1',
            params: '["secret"]',
            duration: 150,
            target: 'quaint',
          },
          'slow',
        ),
      ).toEqual({
        durationMs: 150,
        severity: 'slow',
        query: 'SELECT 1',
        target: 'quaint',
      });
    });

    it('truncates params when includeParams', () => {
      const params = 'x'.repeat(300);
      const payload = buildPrismaSlowQueryPayload(
        { query: 'SELECT 1', params, duration: 1200 },
        'very_slow',
        { includeParams: true },
      );
      expect(payload.params?.endsWith('…')).toBe(true);
      expect(payload.params?.length).toBe(257);
    });
  });
});
