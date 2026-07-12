import {
  buildEnrichmentSignals,
  sanitizeEnrichmentSignalsV1,
  sanitizeEnrichmentSignalsV1ForPersist,
  wrapEnrichmentV1,
} from './enrichment-signals';

describe('sanitizeEnrichmentSignalsV1', () => {
  it('nulls invalid scalar strings and repairs legacy phrases', () => {
    expect(
      sanitizeEnrichmentSignalsV1({
        dailyRhythm: 'not a rhythm label',
        kidsTimeline: 'wants a family',
        conflictStyleDetail: 'process together',
        autonomyTogethernessDepth: 'quality over quantity',
        interestsTop3: ['travel', 1 as unknown as string, 'music'],
      }),
    ).toEqual({
      dailyRhythm: null,
      kidsTimeline: 'wants_kids',
      conflictStyleDetail: 'process_together',
      autonomyTogethernessDepth: 'quality_over_quantity',
      communicationMode: null,
      relationshipPace: null,
      interestsTop3: ['travel', 'music'],
    });
  });
});

describe('sanitizeEnrichmentSignalsV1ForPersist', () => {
  it('invokes onDropped for non-empty raw strings that coerce to null', () => {
    const dropped: Array<{ field: string; rawValue: string }> = [];
    sanitizeEnrichmentSignalsV1ForPersist(
      {
        dailyRhythm: 'totally unknown rhythm phrase',
        kidsTimeline: 'wants_kids',
        conflictStyleDetail: null,
        autonomyTogethernessDepth: null,
        interestsTop3: [],
      },
      {
        profileId: 'p1',
        onDropped: (e) => dropped.push({ field: e.field, rawValue: e.rawValue }),
      },
    );
    expect(dropped).toEqual([{ field: 'dailyRhythm', rawValue: 'totally unknown rhythm phrase' }]);
  });

  it('does not call onDropped when phrase repairs to canonical', () => {
    const dropped: unknown[] = [];
    sanitizeEnrichmentSignalsV1ForPersist(
      {
        dailyRhythm: 'early bird',
        kidsTimeline: null,
        conflictStyleDetail: null,
        autonomyTogethernessDepth: null,
        interestsTop3: [],
      },
      {
        profileId: 'p2',
        onDropped: () => dropped.push(true),
      },
    );
    expect(dropped).toEqual([]);
  });
});

describe('buildEnrichmentSignals', () => {
  it('example A: reflective startup profile with boundaries and interests', () => {
    const aboutMe =
      'Reflective and calm, startup grind mode. Slow Sundays, journaling and reading. I avoid drama in conflict.';
    const aboutPartner =
      'Childfree and clear about it. Wants loyalty and emotional safety. Gym a few times a week.';
    const aboutRelationship =
      'Not rushing but serious. Repair is normal; we can disagree without contempt.';

    const signals = buildEnrichmentSignals(aboutMe, aboutPartner, aboutRelationship);
    expect(signals).toEqual({
      dailyRhythm: 'slow_mornings',
      autonomyTogethernessDepth: null,
      kidsTimeline: 'childfree',
      conflictStyleDetail: 'avoids_conflict',
      communicationMode: null,
      relationshipPace: 'measured_pace',
      interestsTop3: ['journaling', 'reading', 'gym'],
    });
    expect(wrapEnrichmentV1(signals)).toEqual({
      version: 'v1',
      signals,
    });
  });

  it('example B: fast lifestyle, alone time, kids soon, travel + music', () => {
    const aboutMe =
      'Dry wit, stable 9-5 with side projects. Very fast lifestyle with low routine tolerance. Love travel and live music.';
    const aboutPartner = 'Emotional maturity, generous with people, strict with budgets.';
    const aboutRelationship =
      'Dating intentionally for long-term. Lots of alone time. Wants kids soon. Prefer repair over blame.';

    const signals = buildEnrichmentSignals(aboutMe, aboutPartner, aboutRelationship);
    expect(signals).toEqual({
      dailyRhythm: 'stable_nine_to_five',
      autonomyTogethernessDepth: null,
      kidsTimeline: 'wants_kids_soon',
      conflictStyleDetail: 'repair_over_blame',
      communicationMode: null,
      relationshipPace: null,
      interestsTop3: ['travel', 'music'],
    });
  });

  it('example C: sparse / no strong enrichment cues', () => {
    const signals = buildEnrichmentSignals('Nice person.', 'Kind.', 'Good vibes.');
    expect(signals).toEqual({
      dailyRhythm: null,
      autonomyTogethernessDepth: null,
      kidsTimeline: null,
      conflictStyleDetail: null,
      communicationMode: null,
      relationshipPace: null,
      interestsTop3: [],
    });
  });

  it('autonomy: generic alone-time filler does not fire; explicit phrasing does', () => {
    const generic = buildEnrichmentSignals(
      'I like lots of alone time.',
      '',
      'Lots of alone time is important to me.',
    );
    expect(generic.autonomyTogethernessDepth).toBeNull();

    const explicit = buildEnrichmentSignals(
      'I value my alone time.',
      '',
      'I need alone time to recharge after work.',
    );
    expect(explicit.autonomyTogethernessDepth).toBe('values_alone_time');
  });

  it('conflict: repair is normal without explicit repair codes does not map', () => {
    expect(buildEnrichmentSignals('', '', 'Repair is normal for us.').conflictStyleDetail).toBeNull();
    expect(
      buildEnrichmentSignals('', '', 'We value emotional repair after fights.').conflictStyleDetail,
    ).toBeNull();
    expect(buildEnrichmentSignals('', '', 'We prefer repair over blame.').conflictStyleDetail).toBe(
      'repair_over_blame',
    );
    expect(buildEnrichmentSignals('', '', 'No drama. Prefer repair over blame.').conflictStyleDetail).toBe(
      'repair_over_blame',
    );
  });

  it('conflict: talk it out and calm discussion map to process_together', () => {
    expect(buildEnrichmentSignals('', '', 'We talk it out calmly.').conflictStyleDetail).toBe(
      'process_together',
    );
    expect(buildEnrichmentSignals('', '', 'Calm discussion is our norm.').conflictStyleDetail).toBe(
      'process_together',
    );
  });

  it('conflict: diversity labels', () => {
    expect(buildEnrichmentSignals('I avoid conflict when I can.', '', '').conflictStyleDetail).toBe(
      'avoids_conflict',
    );
    expect(buildEnrichmentSignals('', '', 'Things escalate fast if we are both tired.').conflictStyleDetail).toBe(
      'escalates_quickly',
    );
    expect(buildEnrichmentSignals('', '', 'I go silent when cornered mid-argument.').conflictStyleDetail).toBe(
      'withdraws_shuts_down',
    );
    expect(buildEnrichmentSignals('', '', 'I deflect with humor when it gets heavy.').conflictStyleDetail).toBe(
      'humor_deflect',
    );
    expect(
      buildEnrichmentSignals('', '', 'I want you to read between the lines sometimes.').conflictStyleDetail,
    ).toBe('indirect_communication');
    expect(buildEnrichmentSignals('', '', 'We use direct repair language, not scorekeeping.').conflictStyleDetail).toBe(
      'repair_direct',
    );
  });

  it('daily rhythm: sunrise runs map to early_bird', () => {
    expect(buildEnrichmentSignals('I run before sunrise so my head is clear.', '', '').dailyRhythm).toBe(
      'early_bird',
    );
  });

  it('daily rhythm: remote / multi-country maps to location_flexible', () => {
    expect(
      buildEnrichmentSignals('Software architect, remote. I have lived in three countries.', '', '')
        .dailyRhythm,
    ).toBe('location_flexible');
  });

  it('daily rhythm: not into nightlife maps to quiet_evenings when no earlier rule', () => {
    expect(buildEnrichmentSignals('Not into nightlife; I read at home.', '', '').dailyRhythm).toBe(
      'quiet_evenings',
    );
  });

  it('daily rhythm: night shift → irregular', () => {
    expect(buildEnrichmentSignals('Night-shift ER nurse, three shifts a week.', '', '').dailyRhythm).toBe(
      'irregular',
    );
  });

  it('daily rhythm: 4am starts → early_extreme', () => {
    expect(buildEnrichmentSignals('Pastry: 4am starts every day.', '', '').dailyRhythm).toBe('early_extreme');
  });
});
