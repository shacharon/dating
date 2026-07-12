import { buildEnrichmentSignalsV2, mapEnrichmentV2FromText } from './enrichment-v2';

// ── helper ────────────────────────────────────────────────────────────────────

function pace(text: string) {
  return mapEnrichmentV2FromText(text).relationshipPace;
}

function mode(text: string) {
  return mapEnrichmentV2FromText(text).communicationMode;
}

// ── relationshipPace ──────────────────────────────────────────────────────────

describe('enrichment-v2 — relationshipPace', () => {
  describe('fast_mover', () => {
    it('matches "not looking for a pen pal"', () => {
      expect(pace("I'm not looking for a pen pal — I want to actually meet.")).toBe('fast_mover');
    });

    it('matches "ready to settle down"', () => {
      expect(pace('I am ready to settle down and build something real.')).toBe('fast_mover');
    });

    it('matches "want to meet soon"', () => {
      expect(pace('I want to meet soon — life is short.')).toBe('fast_mover');
    });

    it('matches "ready to take the next step"', () => {
      expect(pace('I feel ready to take the next step in my life.')).toBe('fast_mover');
    });
  });

  describe('slow_build', () => {
    it('matches "take things slowly"', () => {
      expect(pace('I prefer to take things slowly and really get to know someone.')).toBe('slow_build');
    });

    it('matches "slow burn"', () => {
      expect(pace('I love a good slow burn — no need to rush anything.')).toBe('slow_build');
    });

    it('matches "take things very slow"', () => {
      expect(pace('Looking for someone who is okay to take things very slow.')).toBe('slow_build');
    });

    it('matches "prefer a slow build"', () => {
      expect(pace('I prefer a slow build over rushing into things.')).toBe('slow_build');
    });
  });

  describe('no_rush_explicit', () => {
    it('matches "no rush"', () => {
      expect(pace('No rush — just want to see where things go.')).toBe('no_rush_explicit');
    });

    it('matches "not in a hurry"', () => {
      expect(pace('I am not in any hurry to get serious.')).toBe('no_rush_explicit');
    });

    it('matches "no pressure"', () => {
      expect(pace('No pressure, no expectations — just open to meeting someone great.')).toBe('no_rush_explicit');
    });

    it('matches "take things at my own pace"', () => {
      expect(pace('I like to take things at my own pace.')).toBe('no_rush_explicit');
    });
  });

  describe('measured_pace', () => {
    it('matches "see where things go"', () => {
      expect(pace("Happy to see where things go — I'm serious but not in a rush.")).toBe('measured_pace');
    });

    it('matches "let things develop naturally"', () => {
      expect(pace('I like to let things develop naturally without forcing anything.')).toBe('measured_pace');
    });

    it('matches "take it one step at a time"', () => {
      expect(pace('I take it one step at a time and enjoy the process.')).toBe('measured_pace');
    });
  });

  describe('null cases', () => {
    it('returns null when no pace cues present', () => {
      expect(pace('I love hiking and cooking. Looking for a genuine connection.')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(pace('')).toBeNull();
    });

    it('returns null for generic profile text', () => {
      expect(pace('Kind, loyal, funny. Love dogs and travel.')).toBeNull();
    });
  });

  describe('priority ordering', () => {
    it('fast_mover wins over slow_build in ambiguous text (first rule wins)', () => {
      // first rule in the array that matches wins
      const text = 'Not looking for a pen pal, but also willing to take things slowly.';
      // fast_mover rule appears first in RELATIONSHIP_PACE_RULES
      expect(pace(text)).toBe('fast_mover');
    });
  });
});

// ── communicationMode ─────────────────────────────────────────────────────────

describe('enrichment-v2 — communicationMode', () => {
  describe('deep_talker', () => {
    it('matches "could talk for hours"', () => {
      expect(mode('I could talk for hours about almost anything.')).toBe('deep_talker');
    });

    it('matches "late-night conversations"', () => {
      expect(mode('I love late-night conversations that go nowhere and everywhere.')).toBe('deep_talker');
    });

    it('matches "love a good debate"', () => {
      expect(mode('I love a good debate and exchanging ideas.')).toBe('deep_talker');
    });

    it('matches "deep conversations about"', () => {
      expect(mode('I enjoy deep conversations about life, philosophy, and weird things.')).toBe('deep_talker');
    });
  });

  describe('action_oriented', () => {
    it('matches "actions speak louder"', () => {
      expect(mode('I believe actions speak louder than words.')).toBe('action_oriented');
    });

    it('matches "express myself through actions"', () => {
      expect(mode('I tend to express myself through actions more than words.')).toBe('action_oriented');
    });

    it('matches "I show not tell"', () => {
      expect(mode('I am more of an I show, not tell kind of person.')).toBe('action_oriented');
    });
  });

  describe('reserved_opener', () => {
    it('matches "slow to open up"', () => {
      expect(mode('I am slow to open up but very loyal once I do.')).toBe('reserved_opener');
    });

    it('matches "takes time to open up"', () => {
      expect(mode('It takes time to open up around new people for me.')).toBe('reserved_opener');
    });

    it('matches "private person"', () => {
      expect(mode('I am a private person but caring.')).toBe('reserved_opener');
    });

    it('matches "guarded at first"', () => {
      expect(mode('I tend to be guarded at first but warm up quickly.')).toBe('reserved_opener');
    });
  });

  describe('text_heavy', () => {
    it('matches "love texting"', () => {
      expect(mode('I love texting — I am very communicative over text.')).toBe('text_heavy');
    });

    it('matches "better over text"', () => {
      expect(mode('I am honestly better over text than in person at first.')).toBe('text_heavy');
    });
  });

  describe('verbal_expressive', () => {
    it('matches "love talking"', () => {
      expect(mode('I love talking and sharing my feelings openly.')).toBe('verbal_expressive');
    });

    it('matches "very expressive"', () => {
      expect(mode('I am a very expressive person when it comes to emotions.')).toBe('verbal_expressive');
    });

    it('matches "open communicator"', () => {
      expect(mode('I am an open communicator and value honesty.')).toBe('verbal_expressive');
    });
  });

  describe('null cases', () => {
    it('returns null when no communication mode cues present', () => {
      expect(mode('I enjoy hiking, cooking, and good company.')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(mode('')).toBeNull();
    });

    it('returns null for generic profile text', () => {
      expect(mode('Looking for something real. Kind, honest, adventurous.')).toBeNull();
    });
  });

  describe('priority ordering — deep_talker before verbal_expressive', () => {
    it('classifies as deep_talker when both deep-talk and verbal cues appear', () => {
      // deep_talker rule appears before verbal_expressive in COMMUNICATION_MODE_RULES.
      // "could talk for hours" matches deep_talker; "love talking" would match verbal_expressive.
      const text = 'I could talk for hours and I love talking openly about feelings.';
      expect(mode(text)).toBe('deep_talker');
    });
  });
});

// ── existing signals are not regressed ───────────────────────────────────────

describe('enrichment-v2 — regression: existing signals still work', () => {
  it('dailyRhythm is still extracted', () => {
    const r = mapEnrichmentV2FromText('I am an early bird — usually up by 5am.');
    expect(r.dailyRhythm).toBe('early_bird');
  });

  it('conflictStyleDetail is still extracted', () => {
    const r = mapEnrichmentV2FromText('I prefer to process together and avoid drama.');
    expect(r.conflictStyleDetail).toBe('process_together');
  });

  it('kidsTimeline is still extracted', () => {
    const r = mapEnrichmentV2FromText('I am childfree and happy that way.');
    expect(r.kidsTimeline).toBe('childfree');
  });

  it('autonomyTogethernessDepth is still extracted', () => {
    const r = mapEnrichmentV2FromText('I believe in being independent together.');
    expect(r.autonomyTogethernessDepth).toBe('interdependence');
  });

  it('interestsTop3 is still extracted', () => {
    const r = mapEnrichmentV2FromText('I love hiking, reading, and yoga in my free time.');
    expect(r.interestsTop3).toContain('hiking');
  });

  it('new fields are null when no cues present', () => {
    const r = mapEnrichmentV2FromText('I am an early bird who loves hiking.');
    expect(r.relationshipPace).toBeNull();
    expect(r.communicationMode).toBeNull();
  });
});

// ── buildEnrichmentSignalsV2 (three-block entry point) ───────────────────────

describe('buildEnrichmentSignalsV2', () => {
  it('extracts relationshipPace from relationship block', () => {
    const r = buildEnrichmentSignalsV2(
      'I love hiking.',
      'Looking for someone kind.',
      'No rush — happy to see where things go.',
    );
    expect(r.relationshipPace).toBe('no_rush_explicit');
  });

  it('extracts communicationMode from aboutMe block', () => {
    const r = buildEnrichmentSignalsV2(
      'I could talk for hours and love deep conversations.',
      '',
      '',
    );
    expect(r.communicationMode).toBe('deep_talker');
  });

  it('returns null for both when no cues in any block', () => {
    const r = buildEnrichmentSignalsV2('Kind and funny.', 'Loyal person.', 'Real connection.');
    expect(r.relationshipPace).toBeNull();
    expect(r.communicationMode).toBeNull();
  });
});
