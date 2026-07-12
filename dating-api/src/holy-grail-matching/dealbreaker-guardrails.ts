/**
 * Kill-switch env is re-read each call (no process-lifetime cache) so tests and
 * same-process env toggles work; production still sets env before workers start.
 *
 * Post-extract guardrails for dealbreaker signals (Sprint 17 Story 3).
 *
 * Confidence floor is a regression gate for future pattern edits — not a product tuning knob.
 * Raising recall by lowering DEALBREAKER_HARD_MIN_CONFIDENCE is forbidden without a new story.
 *
 * Kill switch: DEALBREAKER_HARD_DISABLED_TAGS=smoking,jealousy (CSV of closed taxonomy tags).
 * Ops: change env + restart API — see docs/ops/dealbreaker-kill-switch.md.
 */

import { DEALBREAKER_TAG_SET } from './dealbreaker-taxonomy';
import type { DealbreakerSignal } from './dealbreaker-signals-text.extract';

/**
 * HARD_* must be at or above this confidence. Today hard phrase hits emit 0.95;
 * soft emits 0.65. Mid-confidence HARD from a future edit is demoted to SOFT.
 */
export const DEALBREAKER_HARD_MIN_CONFIDENCE = 0.9;

export const DEALBREAKER_HARD_DISABLED_TAGS_ENV = 'DEALBREAKER_HARD_DISABLED_TAGS';

let loggedInvalidTags = false;

/**
 * Parse kill-switch env. Invalid (non-taxonomy) tags are ignored.
 * Pass `env` in tests; production defaults to `process.env`.
 */
export function readDealbreakerHardDisabledTagsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
  const raw = env[DEALBREAKER_HARD_DISABLED_TAGS_ENV];
  if (raw === undefined || raw.trim() === '') {
    return new Set();
  }
  const disabled = new Set<string>();
  const invalid: string[] = [];
  for (const part of raw.split(',')) {
    const tag = part.trim();
    if (!tag) continue;
    if (DEALBREAKER_TAG_SET.has(tag)) {
      disabled.add(tag);
    } else {
      invalid.push(tag);
    }
  }
  if (invalid.length > 0 && !loggedInvalidTags) {
    loggedInvalidTags = true;
    // eslint-disable-next-line no-console -- startup/ops visibility without Nest DI
    console.warn(
      `[dealbreaker-guardrails] ignoring unknown tags in ${DEALBREAKER_HARD_DISABLED_TAGS_ENV}: ${invalid.join(',')}`,
    );
  }
  return disabled;
}

/** Live request path — re-reads `process.env` each call (no sticky cache). */
export function getCachedDealbreakerHardDisabledTags(): ReadonlySet<string> {
  return readDealbreakerHardDisabledTagsFromEnv();
}

/** Test helper — clears invalid-tag warn latch. */
export function resetDealbreakerHardDisabledTagsCacheForTests(): void {
  loggedInvalidTags = false;
}

function isHard(
  c: DealbreakerSignal['classification'],
): c is 'HARD_EXCLUDE' | 'HARD_REQUIRE' {
  return c === 'HARD_EXCLUDE' || c === 'HARD_REQUIRE';
}

/**
 * Demote HARD_EXCLUDE / HARD_REQUIRE → SOFT when:
 *  - confidence < DEALBREAKER_HARD_MIN_CONFIDENCE, OR
 *  - tag ∈ kill-switch set
 * Never upgrades SOFT → HARD. Never drops tags.
 */
export function applyDealbreakerGuardrails(
  signals: readonly DealbreakerSignal[],
  opts?: { readonly hardDisabledTags?: ReadonlySet<string> },
): readonly DealbreakerSignal[] {
  const disabled =
    opts?.hardDisabledTags ?? getCachedDealbreakerHardDisabledTags();
  return signals.map((s) => {
    if (!isHard(s.classification)) return s;
    if (
      s.confidence < DEALBREAKER_HARD_MIN_CONFIDENCE ||
      disabled.has(s.tag)
    ) {
      return { ...s, classification: 'SOFT' as const };
    }
    return s;
  });
}

/** True when a hard signal would be demoted under the given opts (for audit). */
export function wouldDemoteHardDealbreaker(
  signal: DealbreakerSignal,
  opts?: { readonly hardDisabledTags?: ReadonlySet<string> },
): boolean {
  if (!isHard(signal.classification)) return false;
  const disabled =
    opts?.hardDisabledTags ?? getCachedDealbreakerHardDisabledTags();
  return (
    signal.confidence < DEALBREAKER_HARD_MIN_CONFIDENCE ||
    disabled.has(signal.tag)
  );
}
