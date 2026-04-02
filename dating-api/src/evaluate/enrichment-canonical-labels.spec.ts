import {
  coerceEnrichmentAutonomyTogetherness,
  coerceEnrichmentConflictStyleDetail,
  coerceEnrichmentDailyRhythm,
  coerceEnrichmentKidsTimeline,
  sanitizeEnrichmentCoreScalars,
} from './enrichment-canonical-labels';

describe('enrichment canonical labels', () => {
  it('accepts exact canonical snake_case', () => {
    expect(coerceEnrichmentDailyRhythm('early_bird')).toBe('early_bird');
    expect(coerceEnrichmentKidsTimeline('childfree')).toBe('childfree');
  });

  it('accepts spaced or mixed case variants of canonical labels', () => {
    expect(coerceEnrichmentDailyRhythm('Early Bird')).toBe('early_bird');
    expect(coerceEnrichmentDailyRhythm('stable nine to five')).toBe('stable_nine_to_five');
  });

  it('repairs known legacy phrase-style values', () => {
    expect(coerceEnrichmentKidsTimeline('wants a family')).toBe('wants_kids');
    expect(coerceEnrichmentConflictStyleDetail('repair over blame')).toBe('repair_over_blame');
    expect(coerceEnrichmentAutonomyTogetherness('independent together')).toBe('interdependence');
  });

  it('rejects unknown free text', () => {
    expect(coerceEnrichmentDailyRhythm('I like long walks')).toBeNull();
    expect(coerceEnrichmentKidsTimeline('maybe someday children')).toBeNull();
    expect(coerceEnrichmentConflictStyleDetail('we just vibe')).toBeNull();
    expect(coerceEnrichmentAutonomyTogetherness('super clingy')).toBeNull();
  });

  it('sanitizeEnrichmentCoreScalars bundles four fields', () => {
    expect(
      sanitizeEnrichmentCoreScalars({
        dailyRhythm: 'early bird',
        autonomyTogethernessDepth: 'values alone time',
        kidsTimeline: 'wants kids soon',
        conflictStyleDetail: 'escalates quickly',
      }),
    ).toEqual({
      dailyRhythm: 'early_bird',
      autonomyTogethernessDepth: 'values_alone_time',
      kidsTimeline: 'wants_kids_soon',
      conflictStyleDetail: 'escalates_quickly',
    });
  });
});
