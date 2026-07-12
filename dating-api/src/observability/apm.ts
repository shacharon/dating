/**
 * Optional Datadog APM bootstrap.
 * Load from `main.ts` before NestFactory when DD_TRACE_ENABLED=1 (or DD_API_KEY set).
 * Install optional dep: `npm i dd-trace` in environments that need APM.
 */
export function initApm(): void {
  const enabled =
    process.env.DD_TRACE_ENABLED === '1' ||
    process.env.DD_TRACE_ENABLED === 'true' ||
    Boolean(process.env.DD_API_KEY?.trim());
  if (!enabled) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracer = require('dd-trace');
    tracer.init({
      service: process.env.DD_SERVICE || 'dating-api',
      env: process.env.DD_ENV || process.env.NODE_ENV || 'development',
      logInjection: true,
      runtimeMetrics: true,
      sampleRate: Number(process.env.DD_TRACE_SAMPLE_RATE ?? '1'),
    });
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ event: 'apm_init', provider: 'datadog' }));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      JSON.stringify({
        event: 'apm_init_skipped',
        reason: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}
