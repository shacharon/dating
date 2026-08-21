import { mapEnrichmentV2FromText } from './enrichment-v2';

describe('ENRICHMENT_V2 (legacy V4 fixtures) autonomy (miss review phrases only)', () => {
  it('slow pace on merging lives → interdependence', () => {
    expect(mapEnrichmentV2FromText('Slow pace on merging lives matters to me.').autonomyTogethernessDepth).toBe(
      'interdependence',
    );
  });

  it('life outside mine → interdependence', () => {
    expect(mapEnrichmentV2FromText('Lives a life outside mine so we swap stories.').autonomyTogethernessDepth).toBe(
      'interdependence',
    );
  });

  it('not rushed into cohabiting → independence_with_space', () => {
    expect(
      mapEnrichmentV2FromText('Steady pace: I am not rushed into cohabiting.').autonomyTogethernessDepth,
    ).toBe('independence_with_space');
  });

  it('space after a fight → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('Space after a fight before we debrief works.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('alone time to finish deep work → independence_with_space', () => {
    expect(
      mapEnrichmentV2FromText('I need alone time to finish deep work without guilt.').autonomyTogethernessDepth,
    ).toBe('independence_with_space');
  });
});

describe('ENRICHMENT_V2 (legacy V4 fixtures) interests (miss review phrases only)', () => {
  it('patisserie weekends / compete in regional patisserie → cooking', () => {
    expect(mapEnrichmentV2FromText('I compete in regional patisserie weekends twice a year.').interestsTop3).toContain(
      'cooking',
    );
  });

  it('solo walks the orchard → walking', () => {
    expect(mapEnrichmentV2FromText('I still need solo walks the orchard after market.').interestsTop3).toContain(
      'walking',
    );
  });

  it('build furniture from plans after architectural model maker lead-in → model_building', () => {
    expect(
      mapEnrichmentV2FromText(
        'Architectural model maker—balsa and tweezers. I build furniture from plans I sketch.',
      ).interestsTop3,
    ).toContain('model_building');
  });

  it('furniture building phrase → model_building when not blocked', () => {
    expect(mapEnrichmentV2FromText('Weekend furniture building in the garage.').interestsTop3).toContain(
      'model_building',
    );
  });
});
