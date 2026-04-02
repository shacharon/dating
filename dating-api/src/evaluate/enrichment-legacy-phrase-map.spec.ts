import {
  LEGACY_ENRICHMENT_PHRASE_TO_AUTONOMY,
  LEGACY_ENRICHMENT_PHRASE_TO_CONFLICT_STYLE,
  LEGACY_ENRICHMENT_PHRASE_TO_DAILY_RHYTHM,
  LEGACY_ENRICHMENT_PHRASE_TO_KIDS_TIMELINE,
} from './enrichment-legacy-phrase-map';
import { sanitizeEnrichmentCoreScalars } from './enrichment-canonical-labels';

describe('enrichment-legacy-phrase-map', () => {
  it('tables are non-empty phrase → snake_case maps', () => {
    expect(Object.keys(LEGACY_ENRICHMENT_PHRASE_TO_DAILY_RHYTHM).length).toBeGreaterThan(0);
    expect(Object.keys(LEGACY_ENRICHMENT_PHRASE_TO_AUTONOMY).length).toBeGreaterThan(0);
    expect(Object.keys(LEGACY_ENRICHMENT_PHRASE_TO_KIDS_TIMELINE).length).toBeGreaterThan(0);
    expect(Object.keys(LEGACY_ENRICHMENT_PHRASE_TO_CONFLICT_STYLE).length).toBeGreaterThan(0);
  });

  it('coerce uses legacy tables only for phrase-shaped values (via sanitizeEnrichmentCoreScalars)', () => {
    expect(
      sanitizeEnrichmentCoreScalars({
        kidsTimeline: 'wants a family',
        conflictStyleDetail: 'repair over blame',
        dailyRhythm: 'early bird',
        autonomyTogethernessDepth: 'independent together',
      }),
    ).toEqual({
      kidsTimeline: 'wants_kids',
      conflictStyleDetail: 'repair_over_blame',
      dailyRhythm: 'early_bird',
      autonomyTogethernessDepth: 'interdependence',
    });
  });

  it('maps four backfill-gap phrases to extractor-aligned canonical codes', () => {
    expect(
      sanitizeEnrichmentCoreScalars({
        dailyRhythm: 'night owl',
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: null,
      }).dailyRhythm,
    ).toBe('late');
    expect(
      sanitizeEnrichmentCoreScalars({
        dailyRhythm: 'fast-paced lifestyle',
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: null,
      }).dailyRhythm,
    ).toBe('fast_paced');
    expect(
      sanitizeEnrichmentCoreScalars({
        dailyRhythm: null,
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: 'talks issues through',
      }).conflictStyleDetail,
    ).toBe('process_together');
    expect(
      sanitizeEnrichmentCoreScalars({
        dailyRhythm: null,
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: 'needs cooldown after conflict',
      }).conflictStyleDetail,
    ).toBe('cooldown_then_talk');
  });
});
