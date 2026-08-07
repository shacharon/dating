import {
  TEASER_ASK_HINT_MAX_CHARS,
  TEASER_BANNED_TOKENS,
  TEASER_FALLBACK_LINE,
  TEASER_MODE_A_MAX_CHARS,
  TEASER_MODE_B_MAX_WORDS,
  TEASER_MODE_C_LINE_MAX_CHARS,
  assembleMatchTeaserFacts,
  buildDefaultMatchTeaser,
  buildMatchTeaser,
  resolveTeaserMode,
  scrubTeaserFragment,
  withTeaserScore,
  type MatchTeaserFacts,
} from './match-teaser';
import { CHIP_TO_TRAIT } from './match-explanation-traits';

function assertNoBanned(text: string) {
  const lower = text.toLowerCase();
  for (const token of TEASER_BANNED_TOKENS) {
    expect(lower).not.toContain(token.toLowerCase());
  }
}

describe('resolveTeaserMode', () => {
  it('prefers dating chapter over age', () => {
    expect(
      resolveTeaserMode({ datingChapter: 'ready_again', ageYears: 28 }),
    ).toBe('ready_again');
    expect(
      resolveTeaserMode({ datingChapter: 'new_chapter', ageYears: 30 }),
    ).toBe('new_chapter');
  });

  it('uses age bands when chapter unset', () => {
    expect(resolveTeaserMode({ ageYears: 34 })).toBe('first_chapter');
    expect(resolveTeaserMode({ ageYears: 35 })).toBe('ready_again');
    expect(resolveTeaserMode({ ageYears: 44 })).toBe('ready_again');
    expect(resolveTeaserMode({ ageYears: 45 })).toBe('new_chapter');
  });

  it('defaults to first_chapter when unknown', () => {
    expect(resolveTeaserMode({})).toBe('first_chapter');
    expect(resolveTeaserMode({ datingChapter: null, ageYears: null })).toBe(
      'first_chapter',
    );
    expect(
      resolveTeaserMode({ datingChapter: 'younger' as never, ageYears: 50 }),
    ).toBe('new_chapter');
  });

  it('boundary ages 18 and 99', () => {
    expect(resolveTeaserMode({ ageYears: 18 })).toBe('first_chapter');
    expect(resolveTeaserMode({ ageYears: 99 })).toBe('new_chapter');
  });
});

describe('buildDefaultMatchTeaser viewer mode', () => {
  it('builds Mode C when viewer chapter is new_chapter', () => {
    const teaser = buildDefaultMatchTeaser(
      {
        score: 88,
        priorityTier: 'HIGH',
        explainability: null,
        recommendation: null,
      },
      { datingChapter: 'new_chapter', ageYears: 28 },
    );
    expect(teaser.mode).toBe('new_chapter');
  });

  it('uses age proxy when chapter unset', () => {
    const teaser = buildDefaultMatchTeaser(
      {
        score: 88,
        priorityTier: 'HIGH',
        explainability: null,
        recommendation: null,
      },
      { datingChapter: null, ageYears: 50 },
    );
    expect(teaser.mode).toBe('new_chapter');
  });
});

describe('buildMatchTeaser', () => {
  it('golden Mode A — first_chapter', () => {
    const facts: MatchTeaserFacts = {
      score: 78,
      priorityTier: 'GOOD',
      positiveChips: [],
      dailyRhythmNote: 'Both night owls',
      primaryTakeaway: 'she bakes on Saturdays',
      askTopic: 'Japan',
    };
    const teaser = buildMatchTeaser('first_chapter', facts);
    expect(teaser).toEqual({
      mode: 'first_chapter',
      lines: ['Both night owls · she bakes on Saturdays · ask about Japan'],
      showScore: true,
      score: 78,
      askHint: 'ask about Japan',
    });
    assertNoBanned(teaser.lines.join(' '));
  });

  it('golden Mode B — ready_again', () => {
    const facts: MatchTeaserFacts = {
      score: 92,
      priorityTier: 'HIGH',
      positiveChips: [],
      seriousnessNote: 'Both want something serious — kids already clear',
    };
    const teaser = buildMatchTeaser('ready_again', facts);
    expect(teaser.mode).toBe('ready_again');
    expect(teaser.lines).toEqual([]);
    expect(teaser.claim).toBe(
      'Both want something serious — kids already clear',
    );
    expect(teaser.showScore).toBe(true);
    expect(teaser.score).toBe(92);
    expect(teaser.askHint).toBeUndefined();
    expect(teaser.claim!.split(/\s+/).length).toBeLessThanOrEqual(
      TEASER_MODE_B_MAX_WORDS,
    );
    assertNoBanned(teaser.claim!);
  });

  it('golden Mode C — new_chapter', () => {
    const facts: MatchTeaserFacts = {
      score: 88,
      priorityTier: 'HIGH',
      positiveChips: [],
      seriousnessNote: 'both want a real partnership',
      kidsNote: 'Kids situation aligned',
      locationOverlapNote: 'same city',
      askTopic: 'her travel',
    };
    const teaser = buildMatchTeaser('new_chapter', facts);
    expect(teaser).toEqual({
      mode: 'new_chapter',
      lines: [
        '88% · both want a real partnership',
        'Kids situation aligned · same city · ask about her travel',
      ],
      showScore: true,
      score: 88,
      askHint: 'ask about her travel',
    });
    for (const line of teaser.lines) {
      expect(line.length).toBeLessThanOrEqual(TEASER_MODE_C_LINE_MAX_CHARS);
      assertNoBanned(line);
    }
  });

  it('HIGH + sparse facts still returns non-empty teaser', () => {
    const facts: MatchTeaserFacts = {
      score: 90,
      priorityTier: 'HIGH',
      positiveChips: [],
    };
    const a = buildMatchTeaser('first_chapter', facts);
    expect(a.lines[0]).toBe(TEASER_FALLBACK_LINE);
    const b = buildMatchTeaser('ready_again', facts);
    expect(b.claim).toBe(TEASER_FALLBACK_LINE);
    const c = buildMatchTeaser('new_chapter', facts);
    expect(c.lines[0]).toContain(TEASER_FALLBACK_LINE);
  });

  it('scrubs banned jargon and chip labels from fragments', () => {
    expect(scrubTeaserFragment('Strong Ambition alignment here')).toBeNull();
    expect(scrubTeaserFragment('friction score is high')).toBeNull();
    expect(scrubTeaserFragment('Emotional depth')).toBeNull();
    expect(scrubTeaserFragment('Same weekend energy')).toBe(
      'Same weekend energy',
    );
  });

  it('never emits chip labels when chips are the only source', () => {
    const facts: MatchTeaserFacts = {
      score: 70,
      priorityTier: 'GOOD',
      positiveChips: Object.keys(CHIP_TO_TRAIT).slice(0, 3),
    };
    for (const mode of [
      'first_chapter',
      'ready_again',
      'new_chapter',
    ] as const) {
      const teaser = buildMatchTeaser(mode, facts);
      const blob = [
        ...teaser.lines,
        teaser.claim ?? '',
        teaser.askHint ?? '',
      ].join(' ');
      assertNoBanned(blob);
    }
  });

  it('enforces Mode A length cap', () => {
    const long = 'x'.repeat(200);
    const teaser = buildMatchTeaser('first_chapter', {
      score: 50,
      priorityTier: 'OTHER',
      positiveChips: [],
      dailyRhythmNote: long,
    });
    expect(teaser.lines[0]!.length).toBeLessThanOrEqual(TEASER_MODE_A_MAX_CHARS);
  });

  it('askHint respects max length', () => {
    const teaser = buildMatchTeaser('first_chapter', {
      score: 60,
      priorityTier: 'OTHER',
      positiveChips: [],
      askTopic: 'a'.repeat(80),
    });
    expect(teaser.askHint!.length).toBeLessThanOrEqual(TEASER_ASK_HINT_MAX_CHARS);
  });

  it('Mode B claim word cap truncates with ellipsis', () => {
    const teaser = buildMatchTeaser('ready_again', {
      score: 91,
      priorityTier: 'HIGH',
      positiveChips: [],
      seriousnessNote:
        'Both want something serious and clear kids timeline with shared long term plans together forever',
    });
    expect(teaser.claim!.endsWith('…')).toBe(true);
    expect(teaser.claim!.split(/\s+/).length).toBeLessThanOrEqual(
      TEASER_MODE_B_MAX_WORDS,
    );
  });

  it('does not invent kids alignment when timelines conflict', () => {
    const enrichment = (kidsTimeline: string) =>
      ({
        id: 'p',
        name: 'n',
        texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
        evaluation: {
          enrichment: {
            version: 'v1',
            signals: {
              kidsTimeline,
              dailyRhythm: null,
              relationshipPace: null,
              interestsTop3: [],
              autonomyTogethernessDepth: null,
              conflictStyleDetail: null,
              communicationMode: null,
            },
          },
        },
        savedAt: '2026-01-01',
      }) as never;

    const facts = assembleMatchTeaserFacts({
      score: 90,
      priorityTier: 'HIGH',
      explainability: null,
      recommendation: null,
      viewerPayload: enrichment('childfree'),
      candidatePayload: enrichment('wants_kids'),
    });
    expect(facts.kidsAligned).toBeNull();
    expect(facts.kidsNote).toBeNull();
  });

  it('does not invent kids alignment between already_has_kids and wants_kids', () => {
    const enrichment = (kidsTimeline: string) =>
      ({
        id: 'p',
        name: 'n',
        texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
        evaluation: {
          enrichment: {
            version: 'v1',
            signals: {
              kidsTimeline,
              dailyRhythm: null,
              relationshipPace: null,
              interestsTop3: [],
              autonomyTogethernessDepth: null,
              conflictStyleDetail: null,
              communicationMode: null,
            },
          },
        },
        savedAt: '2026-01-01',
      }) as never;

    const facts = assembleMatchTeaserFacts({
      score: 90,
      priorityTier: 'HIGH',
      explainability: null,
      recommendation: null,
      viewerPayload: enrichment('already_has_kids'),
      candidatePayload: enrichment('wants_kids'),
    });
    expect(facts.kidsAligned).toBeNull();
    expect(facts.kidsNote).toBeNull();
  });

  it('locale other than en still returns English Mode A copy', () => {
    const teaser = buildMatchTeaser(
      'first_chapter',
      {
        score: 70,
        priorityTier: 'GOOD',
        positiveChips: [],
        dailyRhythmNote: 'Both night owls',
      },
      'en',
    );
    expect(teaser.lines[0]).toBe('Both night owls');
  });

  it('withTeaserScore refreshes score without changing lines', () => {
    const base = buildMatchTeaser('first_chapter', {
      score: 70,
      priorityTier: 'GOOD',
      positiveChips: [],
      dailyRhythmNote: 'Both night owls',
    });
    const updated = withTeaserScore(base, 91.4);
    expect(updated.score).toBe(91);
    expect(updated.lines).toEqual(base.lines);
    expect(updated.mode).toBe('first_chapter');
  });
});

describe('assembleMatchTeaserFacts + buildDefaultMatchTeaser', () => {
  it('defaults to first_chapter and uses listPhrase not chip labels', () => {
    const teaser = buildDefaultMatchTeaser({
      score: 80,
      priorityTier: 'GOOD',
      explainability: {
        positiveChips: ['Ambition alignment', 'Lifestyle pace'],
        reasonShort: 'Ambition alignment is strong',
        sharedInterestNote: 'You both enjoy hiking.',
      },
      recommendation: {
        explainability: {
          positiveChips: ['Ambition alignment'],
          reasonShort: 'x',
        },
        primaryTakeaway: 'You both share a drive for goals and a similar daily pace.',
        suggestedNextAction: 'Say hi',
      },
    });
    expect(teaser.mode).toBe('first_chapter');
    expect(teaser.showScore).toBe(true);
    expect(teaser.score).toBe(80);
    assertNoBanned(teaser.lines.join(' '));
    expect(teaser.lines[0]).toBeTruthy();
  });

  it('maps matching enrichment kids + rhythm when payloads present', () => {
    const enrichment = (signals: Record<string, unknown>) =>
      ({
        id: 'p',
        name: 'n',
        texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
        evaluation: {
          enrichment: { version: 'v1', signals },
        },
        savedAt: '2026-01-01',
      }) as never;

    const facts = assembleMatchTeaserFacts({
      score: 88,
      priorityTier: 'HIGH',
      explainability: null,
      recommendation: null,
      viewerPayload: enrichment({
        dailyRhythm: 'late',
        kidsTimeline: 'wants_kids',
        relationshipPace: 'measured_pace',
        interestsTop3: ['travel', 'hiking'],
        autonomyTogethernessDepth: null,
        conflictStyleDetail: null,
        communicationMode: null,
      }),
      candidatePayload: enrichment({
        dailyRhythm: 'late',
        kidsTimeline: 'wants_kids',
        relationshipPace: 'measured_pace',
        interestsTop3: ['travel', 'cooking'],
        autonomyTogethernessDepth: null,
        conflictStyleDetail: null,
        communicationMode: null,
      }),
    });
    expect(facts.dailyRhythmNote).toBe('Both night owls');
    expect(facts.kidsAligned).toBe(true);
    expect(facts.kidsNote).toBe('Kids situation aligned');
    expect(facts.seriousnessNote).toBe('both want a real partnership');
    expect(facts.sharedInterestLabels).toEqual(['travel']);
    expect(facts.askTopic).toBe('travel');
  });
});
