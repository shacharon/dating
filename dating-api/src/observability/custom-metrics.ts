/**
 * Lightweight metric helpers. When Datadog (`dd-trace`) is loaded via
 * `observability/apm.ts`, dogstatsd is available; otherwise we log JSON lines.
 */

function emit(name: string, value: number, tags?: string[]): void {
  const payload = {
    event: 'custom_metric',
    metric: name,
    value,
    tags: tags ?? [],
    ts: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
  try {
    // Optional dogstatsd via dd-trace tracer metrics if present
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const tracer = require('dd-trace');
    const dogstatsd = tracer?.dogstatsd;
    if (dogstatsd && typeof dogstatsd.distribution === 'function') {
      dogstatsd.distribution(name, value, tags);
    } else if (dogstatsd && typeof dogstatsd.histogram === 'function') {
      dogstatsd.histogram(name, value, tags);
    }
  } catch {
    /* dd-trace not installed — log-only */
  }
}

export function recordMatchListLoadTimeMs(ms: number): void {
  emit('match.list.load_time', ms);
}

export function recordProfileAnalysisDurationMs(ms: number): void {
  emit('profile.analysis.duration', ms);
}

export function recordCacheHit(): void {
  emit('cache.hit_rate', 1, ['result:hit']);
}

export function recordCacheMiss(): void {
  emit('cache.hit_rate', 0, ['result:miss']);
}

/** Hydrated candidate rows on match-list cache-miss rebuild (ready only). */
export function recordMatchListCandidatesLoaded(count: number): void {
  emit('match.list.candidates_loaded', count);
}

/** Uncapped photo+prefilter eligible count on miss rebuild (ready only). */
export function recordMatchListCandidatesEligible(count: number): void {
  emit('match.list.candidates_eligible', count);
}

/** Parallel counts + capped findMany duration on miss rebuild. */
export function recordMatchListCandidateLoadMs(ms: number): void {
  emit('match.list.candidate_load_ms', ms);
}

/** `latestEvaluationsForProfileIds` duration on miss rebuild. */
export function recordMatchListEvalQueryMs(ms: number): void {
  emit('match.list.eval_query_ms', ms);
}

/**
 * Score/eligibility loop + product sort on miss rebuild.
 * May include await for hard-block about* batch — not pure CPU.
 */
export function recordMatchListScoreCpuMs(ms: number): void {
  emit('match.list.score_cpu_ms', ms);
}

/** Redis `cache.set` duration after a ready miss rebuild. */
export function recordMatchListCacheSetMs(ms: number): void {
  emit('match.list.cache_set_ms', ms);
}
