import { mapEnrichmentV2FromText } from './enrichment-v2';

/** Ten single-block phrases → expected partial signals (only non-null fields checked). */
describe('mapEnrichmentV2FromText phrase fixtures', () => {
  it('phrase 1: run yeast labs → no running interest', () => {
    expect(mapEnrichmentV2FromText('I run yeast labs at a brewery.').interestsTop3).toEqual([]);
  });

  it('phrase 2: running the checklist → no running interest', () => {
    expect(mapEnrichmentV2FromText('without me running the checklist.').interestsTop3).toEqual([]);
  });

  it('phrase 3: darkroom → photography', () => {
    expect(mapEnrichmentV2FromText('Weekends in the community darkroom.').interestsTop3).toEqual([
      'photography',
    ]);
  });

  it('phrase 4: paragliding → extreme_sports', () => {
    expect(mapEnrichmentV2FromText('Tandem paragliding instructor on weekends.').interestsTop3).toEqual([
      'extreme_sports',
    ]);
  });

  it('phrase 5: cooldown after conflict → cooldown_then_talk', () => {
    expect(mapEnrichmentV2FromText('Cool down after conflict works for me.').conflictStyleDetail).toBe(
      'cooldown_then_talk',
    );
  });

  it('phrase 6: talk it through → process_together', () => {
    expect(mapEnrichmentV2FromText('We talk it through calmly.').conflictStyleDetail).toBe(
      'process_together',
    );
  });

  it('phrase 7: direct repair → repair_direct', () => {
    expect(mapEnrichmentV2FromText('I prefer direct repair when hurt.').conflictStyleDetail).toBe(
      'repair_direct',
    );
  });

  it('phrase 8: not stonewalling → no withdraws_shuts_down', () => {
    expect(
      mapEnrichmentV2FromText('When we disagree I need to write a list; I am not stonewalling.')
        .conflictStyleDetail,
    ).toBeNull();
  });

  it('phrase 9: open on kids timeline → open_timeline', () => {
    expect(mapEnrichmentV2FromText('Partner wants open on kids timeline if we settle.').kidsTimeline).toBe(
      'open_timeline',
    );
  });

  it('phrase 10: independent together → interdependence', () => {
    expect(
      mapEnrichmentV2FromText('Independent together: shared calendar, autonomy on small stuff.')
        .autonomyTogethernessDepth,
    ).toBe('interdependence');
  });
});
