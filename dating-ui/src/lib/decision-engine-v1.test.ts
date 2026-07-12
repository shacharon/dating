import test from 'node:test';
import assert from 'node:assert/strict';
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

test('high score + hard mismatch keeps both decision/reason on mismatch', () => {
  const a = emptySignals();
  const b = emptySignals();
  a.conflictStyleDetail = 'escalates_quickly';
  b.conflictStyleDetail = 'withdraws_shuts_down';

  const out = runDecisionEngineV1({
    compatibilityScore: 88,
    enrichment: { profileA: a, profileB: b },
  });

  assert.equal(out.dominantOutcomeType, 'HARD_TENSION');
  assert.equal(out.dominantOutcomeCode, 'CONFLICT_STYLE_MISMATCH');
  assert.equal(out.decision, 'GOOD_MATCH');
  assert.match(out.primaryReason, /Conflict styles mismatch/i);
  assert.equal(out.suggestedNextAction, 'Slow down and ask one hard-fit question');
  assert.match(out.caution ?? '', /mismatch|friction/i);
});

test('moderate score + strong alignment keeps both decision/reason on alignment', () => {
  const a = emptySignals();
  const b = emptySignals();
  a.kidsTimeline = 'open_timeline';
  b.kidsTimeline = 'open_timeline';

  const out = runDecisionEngineV1({
    compatibilityScore: 61,
    enrichment: { profileA: a, profileB: b },
  });

  assert.equal(out.dominantOutcomeType, 'CORE_MATCH');
  assert.equal(out.dominantOutcomeCode, 'KIDS_ALIGNED');
  assert.equal(out.decision, 'STRONG_MATCH');
  assert.match(out.primaryReason, /Aligned on kids timeline/i);
  assert.equal(out.suggestedNextAction, 'Start a conversation');
});

test('no flags falls back to SCORE_ONLY tier', () => {
  const out = runDecisionEngineV1({
    compatibilityScore: 44,
    enrichment: { profileA: emptySignals(), profileB: emptySignals() },
  });

  assert.equal(out.dominantOutcomeType, 'SCORE_ONLY');
  assert.equal(out.dominantOutcomeCode, null);
  assert.equal(out.decision, 'WEAK_MATCH');
  assert.match(out.primaryReason, /Mixed score/i);
  assert.equal(out.caution, null);
});

test('dealbreaker dominates all top-level UX fields', () => {
  const a = emptySignals();
  const b = emptySignals();
  a.kidsTimeline = 'childfree';
  b.kidsTimeline = 'wants_kids_soon';

  const out = runDecisionEngineV1({
    compatibilityScore: 92,
    enrichment: { profileA: a, profileB: b },
  });

  assert.equal(out.dominantOutcomeType, 'DEALBREAKER');
  assert.equal(out.dominantOutcomeCode, 'KIDS_GOALS_MISMATCH');
  assert.equal(out.decision, 'PASS');
  assert.match(out.primaryReason, /Different timelines for kids/i);
  assert.equal(out.suggestedNextAction, 'Skip this match');
  assert.match(out.caution ?? '', /Kids goals/i);
});

test('uses only closed final-label mapping at engine input', () => {
  const out = runDecisionEngineV1({
    compatibilityScore: 80,
    enrichment: {
      profileA: {
        ...emptySignals(),
        kidsTimeline: 'wants a family',
        dailyRhythm: 'early bird',
      },
      profileB: {
        ...emptySignals(),
        kidsTimeline: 'childfree',
        dailyRhythm: 'late',
      },
    },
  });

  assert.equal(out.dominantOutcomeType, 'SCORE_ONLY');
  assert.equal(out.dominantOutcomeCode, null);
});
