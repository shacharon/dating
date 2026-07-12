import test from 'node:test';
import assert from 'node:assert/strict';
import { mapFinalRuleEnrichmentSignals } from './final-rule-signal-mapper';
import { runDecisionEngineV1 } from './decision-engine-v1';
import type { EnrichmentSignalsLike } from './enrichment-display-v1';

function emptySignals(): EnrichmentSignalsLike {
  return {
    dailyRhythm: null,
    autonomyTogethernessDepth: null,
    kidsTimeline: null,
    conflictStyleDetail: null,
    interestsTop3: [],
  };
}

test('integration: raw final value maps to canonical label', () => {
  const mapped = mapFinalRuleEnrichmentSignals({
    ...emptySignals(),
    conflictStyleDetail: 'repair_direct',
  });

  assert.equal(mapped.conflictStyleDetail, 'repair_direct');
});

test('integration: canonical labels produce deterministic flag', () => {
  const out = runDecisionEngineV1({
    compatibilityScore: 80,
    enrichment: {
      profileA: {
        ...emptySignals(),
        conflictStyleDetail: 'escalates_quickly',
      },
      profileB: {
        ...emptySignals(),
        conflictStyleDetail: 'withdraws_shuts_down',
      },
    },
  });

  assert.equal(out.dominantOutcomeType, 'HARD_TENSION');
  assert.equal(out.dominantOutcomeCode, 'CONFLICT_STYLE_MISMATCH');
  assert.equal(out.decision, 'GOOD_MATCH');
});

test('integration: no fallback to old phrase mapping path', () => {
  const out = runDecisionEngineV1({
    compatibilityScore: 92,
    enrichment: {
      profileA: {
        ...emptySignals(),
        kidsTimeline: 'wants a family',
      },
      profileB: {
        ...emptySignals(),
        kidsTimeline: 'childfree',
      },
    },
  });

  // Old mapper would have converted "wants a family" -> "wants_kids" and triggered a dealbreaker.
  assert.equal(out.dominantOutcomeType, 'SCORE_ONLY');
  assert.equal(out.dominantOutcomeCode, null);
});
