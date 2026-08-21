import {
  ENRICHMENT_FIELD_MAPPERS,
  ENRICHMENT_KEYWORD_MODULE_MANIFEST,
  mapEnrichmentMappedSignals,
} from './enrichment-keyword-manifest';

describe('enrichment-keyword-manifest (structure registry)', () => {
  it('lists domain modules in locked order', () => {
    expect(ENRICHMENT_KEYWORD_MODULE_MANIFEST.map((m) => m.id)).toEqual([
      'enrichment-keyword-helpers',
      'enrichment-interest-keywords',
      'enrichment-rhythm-keywords',
      'enrichment-conflict-keywords',
    ]);
  });

  it('registers field mappers for all EnrichmentMappedSignals keys', () => {
    expect(Object.keys(ENRICHMENT_FIELD_MAPPERS)).toEqual([
      'dailyRhythm',
      'autonomyTogethernessDepth',
      'kidsTimeline',
      'conflictStyleDetail',
      'relationshipPace',
      'communicationMode',
      'interestsTop3',
    ]);
  });

  it('mapEnrichmentMappedSignals returns the closed signal shape', () => {
    const r = mapEnrichmentMappedSignals('I love hiking.');
    expect(Object.keys(r).sort()).toEqual(
      [
        'autonomyTogethernessDepth',
        'communicationMode',
        'conflictStyleDetail',
        'dailyRhythm',
        'interestsTop3',
        'kidsTimeline',
        'relationshipPace',
      ].sort(),
    );
    expect(r.interestsTop3).toContain('hiking');
  });
});
