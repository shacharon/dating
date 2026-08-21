import { mapEnrichmentV2FromText } from './enrichment-v2';

describe('ENRICHMENT_V2 (legacy V3 fixtures) autonomyTogethernessDepth phrases', () => {
  it('maps decompress alone → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('I need to decompress alone after host shifts.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps solo recharge → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('Sunday is for solo recharge, not brunch.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps need space after work → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('I need space after work before I am social.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps need time to myself → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('I need time to myself on weeknights.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps close but not fused → interdependence', () => {
    expect(mapEnrichmentV2FromText('We are close but not fused emotionally.').autonomyTogethernessDepth).toBe(
      'interdependence',
    );
  });

  it('maps together but not on top of each other → interdependence', () => {
    expect(
      mapEnrichmentV2FromText('Together but not on top of each other is my ideal.').autonomyTogethernessDepth,
    ).toBe('interdependence');
  });

  it('maps separate hobbies, shared core → interdependence', () => {
    expect(mapEnrichmentV2FromText('Separate hobbies, shared core values.').autonomyTogethernessDepth).toBe(
      'interdependence',
    );
  });

  it('maps room to breathe → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('I need room to breathe in a relationship.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps own corner / own lane → independence_with_space', () => {
    expect(mapEnrichmentV2FromText('We share a home but I keep my own corner.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
    expect(mapEnrichmentV2FromText('Love with own lanes for career and friends.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('does not infer vague alone-time wording', () => {
    expect(mapEnrichmentV2FromText('I like lots of alone time.').autonomyTogethernessDepth).toBeNull();
  });
});

describe('ENRICHMENT_V2 (legacy V3 fixtures) interestsTop3 phrases', () => {
  it('maps mushroom foraging / spore prints (leisure) → fungi; blocks lab-tech spore prints', () => {
    expect(mapEnrichmentV2FromText('Weekend mushroom foraging is my reset.').interestsTop3).toContain('fungi');
    expect(
      mapEnrichmentV2FromText('Weekday lab tech doing spore prints and IDs for a co-op.').interestsTop3,
    ).not.toContain('fungi');
  });

  it('maps pottery / ceramics (leisure) not elementary art teaching context', () => {
    expect(mapEnrichmentV2FromText('Six months learning pottery badly on sabbatical.').interestsTop3).toContain(
      'pottery',
    );
    expect(
      mapEnrichmentV2FromText('Elementary art teacher—I teach fifth graders to mix glazes.').interestsTop3,
    ).not.toContain('pottery');
  });

  it('maps film developing and darkroom → photography', () => {
    expect(mapEnrichmentV2FromText('I still love film developing in the sink.').interestsTop3).toEqual([
      'photography',
    ]);
  });

  it('maps miniatures when not architectural model maker lead-in', () => {
    expect(mapEnrichmentV2FromText('Evenings painting miniatures at the kitchen table.').interestsTop3).toContain(
      'model_building',
    );
  });

  it('maps skiffs / fiberglass restore → boating; ROV maintenance alone does not', () => {
    expect(
      mapEnrichmentV2FromText('When ashore I restore old fiberglass skiffs in my cousin’s yard.').interestsTop3,
    ).toContain('boating');
    expect(mapEnrichmentV2FromText('I maintain ROVs on a research vessel.').interestsTop3).not.toContain('boating');
  });

  it('maps trail walks → walking', () => {
    expect(mapEnrichmentV2FromText('Dawn trail walks with tea most Saturdays.').interestsTop3).toContain('walking');
  });

  it('maps fermentation journals; blocks brewery yeast lab fermentation', () => {
    expect(mapEnrichmentV2FromText('I disappear into fermentation journals on weekends.').interestsTop3).toContain(
      'fermentation',
    );
    expect(mapEnrichmentV2FromText('I run yeast labs at a brewery.').interestsTop3).not.toContain('fermentation');
  });

  it('maps map-making / neighborhood mapping; blocks conservator restoring maps', () => {
    expect(mapEnrichmentV2FromText('Weekends I map new neighborhoods with a thermos.').interestsTop3).toContain(
      'cartography',
    );
    expect(mapEnrichmentV2FromText('Paper conservator—I restore old maps until my neck cramps.').interestsTop3).not.toContain(
      'cartography',
    );
  });

  it('does not treat bike lanes planner copy as cycling', () => {
    expect(mapEnrichmentV2FromText('Urban planner—I fight for bike lanes downtown.').interestsTop3).not.toContain(
      'cycling',
    );
  });

  it('caps at three distinct interests', () => {
    const t =
      'Mushroom foraging, learning pottery, trail walks, reading topo maps for fun, and swimming laps at dawn.';
    expect(mapEnrichmentV2FromText(t).interestsTop3.length).toBeLessThanOrEqual(3);
  });
});
