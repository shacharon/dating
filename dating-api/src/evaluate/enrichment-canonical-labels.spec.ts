import {
  coerceEnrichmentAutonomyTogetherness,
  coerceEnrichmentCommunicationMode,
  coerceEnrichmentConflictStyleDetail,
  coerceEnrichmentDailyRhythm,
  coerceEnrichmentKidsTimeline,
  coerceEnrichmentRelationshipPace,
  ENRICHMENT_COMMUNICATION_MODE_LABELS,
  ENRICHMENT_RELATIONSHIP_PACE_LABELS,
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

  it('sanitizeEnrichmentCoreScalars bundles four original fields', () => {
    expect(
      sanitizeEnrichmentCoreScalars({
        dailyRhythm: 'early bird',
        autonomyTogethernessDepth: 'values alone time',
        kidsTimeline: 'wants kids soon',
        conflictStyleDetail: 'escalates quickly',
        relationshipPace: null,
        communicationMode: null,
      }),
    ).toMatchObject({
      dailyRhythm: 'early_bird',
      autonomyTogethernessDepth: 'values_alone_time',
      kidsTimeline: 'wants_kids_soon',
      conflictStyleDetail: 'escalates_quickly',
    });
  });

  describe('coerceEnrichmentRelationshipPace', () => {
    it('label set contains exactly the four Phase A labels', () => {
      expect(ENRICHMENT_RELATIONSHIP_PACE_LABELS).toEqual([
        'fast_mover',
        'measured_pace',
        'slow_build',
        'no_rush_explicit',
      ]);
    });

    it('accepts exact canonical labels', () => {
      expect(coerceEnrichmentRelationshipPace('fast_mover')).toBe('fast_mover');
      expect(coerceEnrichmentRelationshipPace('measured_pace')).toBe('measured_pace');
      expect(coerceEnrichmentRelationshipPace('slow_build')).toBe('slow_build');
      expect(coerceEnrichmentRelationshipPace('no_rush_explicit')).toBe('no_rush_explicit');
    });

    it('normalises spaced variants via snake_case coercion', () => {
      expect(coerceEnrichmentRelationshipPace('fast mover')).toBe('fast_mover');
      expect(coerceEnrichmentRelationshipPace('Slow Build')).toBe('slow_build');
      expect(coerceEnrichmentRelationshipPace('No Rush Explicit')).toBe('no_rush_explicit');
    });

    it('repairs known legacy phrases', () => {
      expect(coerceEnrichmentRelationshipPace('no rush')).toBe('no_rush_explicit');
      expect(coerceEnrichmentRelationshipPace('moving fast')).toBe('fast_mover');
      expect(coerceEnrichmentRelationshipPace('slow build')).toBe('slow_build');
    });

    it('returns null for unknown free text', () => {
      expect(coerceEnrichmentRelationshipPace('I want love')).toBeNull();
      expect(coerceEnrichmentRelationshipPace('ready for commitment')).toBeNull();
      expect(coerceEnrichmentRelationshipPace('')).toBeNull();
      expect(coerceEnrichmentRelationshipPace(null)).toBeNull();
      expect(coerceEnrichmentRelationshipPace(undefined)).toBeNull();
    });
  });

  describe('coerceEnrichmentCommunicationMode', () => {
    it('label set contains exactly the five Phase A labels', () => {
      expect(ENRICHMENT_COMMUNICATION_MODE_LABELS).toEqual([
        'verbal_expressive',
        'action_oriented',
        'deep_talker',
        'reserved_opener',
        'text_heavy',
      ]);
    });

    it('accepts exact canonical labels', () => {
      expect(coerceEnrichmentCommunicationMode('verbal_expressive')).toBe('verbal_expressive');
      expect(coerceEnrichmentCommunicationMode('action_oriented')).toBe('action_oriented');
      expect(coerceEnrichmentCommunicationMode('deep_talker')).toBe('deep_talker');
      expect(coerceEnrichmentCommunicationMode('reserved_opener')).toBe('reserved_opener');
      expect(coerceEnrichmentCommunicationMode('text_heavy')).toBe('text_heavy');
    });

    it('normalises spaced variants via snake_case coercion', () => {
      expect(coerceEnrichmentCommunicationMode('deep talker')).toBe('deep_talker');
      expect(coerceEnrichmentCommunicationMode('Action Oriented')).toBe('action_oriented');
      expect(coerceEnrichmentCommunicationMode('reserved opener')).toBe('reserved_opener');
    });

    it('repairs known legacy phrases', () => {
      expect(coerceEnrichmentCommunicationMode('verbal expressive')).toBe('verbal_expressive');
      expect(coerceEnrichmentCommunicationMode('text heavy')).toBe('text_heavy');
    });

    it('returns null for unknown free text', () => {
      expect(coerceEnrichmentCommunicationMode('I love to chat')).toBeNull();
      expect(coerceEnrichmentCommunicationMode('expressive')).toBeNull();
      expect(coerceEnrichmentCommunicationMode('')).toBeNull();
      expect(coerceEnrichmentCommunicationMode(null)).toBeNull();
      expect(coerceEnrichmentCommunicationMode(undefined)).toBeNull();
    });
  });

  describe('sanitizeEnrichmentCoreScalars with new fields', () => {
    it('coerces all six scalar fields together', () => {
      expect(
        sanitizeEnrichmentCoreScalars({
          dailyRhythm: 'early_bird',
          autonomyTogethernessDepth: 'interdependence',
          kidsTimeline: 'childfree',
          conflictStyleDetail: 'repair_over_blame',
          relationshipPace: 'slow_build',
          communicationMode: 'deep_talker',
        }),
      ).toEqual({
        dailyRhythm: 'early_bird',
        autonomyTogethernessDepth: 'interdependence',
        kidsTimeline: 'childfree',
        conflictStyleDetail: 'repair_over_blame',
        relationshipPace: 'slow_build',
        communicationMode: 'deep_talker',
      });
    });

    it('returns null for unknown new field values', () => {
      const result = sanitizeEnrichmentCoreScalars({
        dailyRhythm: null,
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: null,
        relationshipPace: 'definitely moving fast',
        communicationMode: 'chatty person',
      });
      expect(result.relationshipPace).toBeNull();
      expect(result.communicationMode).toBeNull();
    });

    it('passes through null inputs for new fields', () => {
      const result = sanitizeEnrichmentCoreScalars({
        dailyRhythm: null,
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: null,
        relationshipPace: null,
        communicationMode: null,
      });
      expect(result.relationshipPace).toBeNull();
      expect(result.communicationMode).toBeNull();
    });
  });
});
