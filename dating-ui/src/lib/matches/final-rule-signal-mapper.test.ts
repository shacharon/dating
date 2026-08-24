import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FINAL_AUTONOMY_LABELS,
  FINAL_CONFLICT_LABELS,
  FINAL_KIDS_LABELS,
  FINAL_RHYTHM_LABELS,
  mapFinalRuleEnrichmentSignals,
} from './final-rule-signal-mapper';

test('keeps exact final labels and drops unknown values', () => {
  const out = mapFinalRuleEnrichmentSignals({
    kidsTimeline: 'wants_kids',
    conflictStyleDetail: 'process_together',
    dailyRhythm: 'early_bird',
    autonomyTogethernessDepth: 'interdependence',
    interestsTop3: ['hiking', 'music'],
  });

  assert.deepEqual(out, {
    kidsTimeline: 'wants_kids',
    conflictStyleDetail: 'process_together',
    dailyRhythm: 'early_bird',
    autonomyTogethernessDepth: 'interdependence',
    interestsTop3: ['hiking', 'music'],
  });
});

test('does not do phrase normalization or fuzzy matching', () => {
  const out = mapFinalRuleEnrichmentSignals({
    kidsTimeline: 'wants a family',
    conflictStyleDetail: 'repair over blame',
    dailyRhythm: 'early bird',
    autonomyTogethernessDepth: 'independent together',
    interestsTop3: ['hiking'],
  });

  assert.equal(out.kidsTimeline, null);
  assert.equal(out.conflictStyleDetail, null);
  assert.equal(out.dailyRhythm, null);
  assert.equal(out.autonomyTogethernessDepth, null);
  assert.deepEqual(out.interestsTop3, ['hiking']);
});

test('exports closed final label sets', () => {
  assert.equal(FINAL_KIDS_LABELS.length, 5);
  assert.equal(FINAL_CONFLICT_LABELS.length, 9);
  assert.equal(FINAL_RHYTHM_LABELS.length, 12);
  assert.equal(FINAL_AUTONOMY_LABELS.length, 6);
});
