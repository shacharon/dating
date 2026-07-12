import { mapEnrichmentV3FromText } from './enrichment-v3';

describe('ENRICHMENT_V3 autonomyTogethernessDepth phrases', () => {
  it('maps decompress alone → independence_with_space', () => {
    expect(mapEnrichmentV3FromText('I need to decompress alone after host shifts.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps solo recharge → independence_with_space', () => {
    expect(mapEnrichmentV3FromText('Sunday is for solo recharge, not brunch.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps need space after work → independence_with_space', () => {
    expect(mapEnrichmentV3FromText('I need space after work before I am social.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps need time to myself → independence_with_space', () => {
    expect(mapEnrichmentV3FromText('I need time to myself on weeknights.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps close but not fused → interdependence', () => {
    expect(mapEnrichmentV3FromText('We are close but not fused emotionally.').autonomyTogethernessDepth).toBe(
      'interdependence',
    );
  });

  it('maps together but not on top of each other → interdependence', () => {
    expect(
      mapEnrichmentV3FromText('Together but not on top of each other is my ideal.').autonomyTogethernessDepth,
    ).toBe('interdependence');
  });

  it('maps separate hobbies, shared core → interdependence', () => {
    expect(mapEnrichmentV3FromText('Separate hobbies, shared core values.').autonomyTogethernessDepth).toBe(
      'interdependence',
    );
  });

  it('maps room to breathe → independence_with_space', () => {
    expect(mapEnrichmentV3FromText('I need room to breathe in a relationship.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('maps own corner / own lane → independence_with_space', () => {
    expect(mapEnrichmentV3FromText('We share a home but I keep my own corner.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
    expect(mapEnrichmentV3FromText('Love with own lanes for career and friends.').autonomyTogethernessDepth).toBe(
      'independence_with_space',
    );
  });

  it('does not infer vague alone-time wording', () => {
    expect(mapEnrichmentV3FromText('I like lots of alone time.').autonomyTogethernessDepth).toBeNull();
  });
});

describe('ENRICHMENT_V3 interestsTop3 phrases', () => {
  it('maps mushroom foraging / spore prints (leisure) → fungi; blocks lab-tech spore prints', () => {
    expect(mapEnrichmentV3FromText('Weekend mushroom foraging is my reset.').interestsTop3).toContain('fungi');
    expect(
      mapEnrichmentV3FromText('Weekday lab tech doing spore prints and IDs for a co-op.').interestsTop3,
    ).not.toContain('fungi');
  });

  it('maps pottery / ceramics (leisure) not elementary art teaching context', () => {
    expect(mapEnrichmentV3FromText('Six months learning pottery badly on sabbatical.').interestsTop3).toContain(
      'pottery',
    );
    expect(
      mapEnrichmentV3FromText('Elementary art teacher—I teach fifth graders to mix glazes.').interestsTop3,
    ).not.toContain('pottery');
  });

  it('maps film developing and darkroom → photography', () => {
    expect(mapEnrichmentV3FromText('I still love film developing in the sink.').interestsTop3).toEqual([
      'photography',
    ]);
  });

  it('maps miniatures when not architectural model maker lead-in', () => {
    expect(mapEnrichmentV3FromText('Evenings painting miniatures at the kitchen table.').interestsTop3).toContain(
      'model_building',
    );
  });

  it('maps skiffs / fiberglass restore → boating; ROV maintenance alone does not', () => {
    expect(
      mapEnrichmentV3FromText('When ashore I restore old fiberglass skiffs in my cousin’s yard.').interestsTop3,
    ).toContain('boating');
    expect(mapEnrichmentV3FromText('I maintain ROVs on a research vessel.').interestsTop3).not.toContain('boating');
  });

  it('maps trail walks → walking', () => {
    expect(mapEnrichmentV3FromText('Dawn trail walks with tea most Saturdays.').interestsTop3).toContain('walking');
  });

  it('maps fermentation journals; blocks brewery yeast lab fermentation', () => {
    expect(mapEnrichmentV3FromText('I disappear into fermentation journals on weekends.').interestsTop3).toContain(
      'fermentation',
    );
    expect(mapEnrichmentV3FromText('I run yeast labs at a brewery.').interestsTop3).not.toContain('fermentation');
  });

  it('maps map-making / neighborhood mapping; blocks conservator restoring maps', () => {
    expect(mapEnrichmentV3FromText('Weekends I map new neighborhoods with a thermos.').interestsTop3).toContain(
      'cartography',
    );
    expect(mapEnrichmentV3FromText('Paper conservator—I restore old maps until my neck cramps.').interestsTop3).not.toContain(
      'cartography',
    );
  });

  it('does not treat bike lanes planner copy as cycling', () => {
    expect(mapEnrichmentV3FromText('Urban planner—I fight for bike lanes downtown.').interestsTop3).not.toContain(
      'cycling',
    );
  });

  it('caps at three distinct interests', () => {
    const t =
      'Mushroom foraging, learning pottery, trail walks, reading topo maps for fun, and swimming laps at dawn.';
    expect(mapEnrichmentV3FromText(t).interestsTop3.length).toBeLessThanOrEqual(3);
  });
});
