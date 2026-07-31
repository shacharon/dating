import { buildMatchNarrativeFactPack } from './match-narrative-fact-pack';
import { validateLlmNarrative } from './match-narrative-validate';

describe('validateLlmNarrative', () => {
  const pack = buildMatchNarrativeFactPack({
    finalScore: 55,
    explainability: {
      positiveChips: ['Emotional depth'],
      reasonShort: 'x',
    },
  });

  it('rejects empty', () => {
    expect(validateLlmNarrative('  ', pack)).toEqual({
      ok: false,
      reason: 'empty',
    });
  });

  it('rejects too few sentences', () => {
    const r = validateLlmNarrative(
      'Only one line about emotional presence.',
      pack,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/too_few/);
  });

  it('rejects banned fluff phrases', () => {
    const text = [
      'You both share drive and emotional presence day to day.',
      'This creates a solid foundation for a meaningful connection ahead.',
      'Your lifestyles also seem to move at a similar daily pace.',
      'Overall these threads give a promising basis for exploration.',
      'It might be worth taking a closer look at this potential relationship.',
    ].join(' ');
    const r = validateLlmNarrative(text, pack);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/banned_phrase/);
  });

  it('rejects ambition alignment jargon', () => {
    const text = [
      'You both share a strong passion for your goals and ambitions.',
      'This ambition alignment sets up how you show up for work.',
      'You also care about emotional presence when things get real.',
      'Daily pace looks similar enough to not grate right away.',
      'Say hello and see whether the energy holds in chat.',
    ].join(' ');
    const r = validateLlmNarrative(text, pack);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/banned_phrase:ambition alignment/);
  });

  it('rejects v3 brochure CTA paragraph', () => {
    const text = [
      'You both go hard on your goals and share a similar drive that can push each other forward.',
      "There's a mutual appreciation for depth and emotional presence in relationships, which can lead to more meaningful conversations and connections.",
      'You also tend to move at a similar pace, meaning how you both structure your days aligns nicely.',
      'It could be worth a closer look to see how these commonalities play out in a one-on-one setting.',
    ].join(' ');
    const r = validateLlmNarrative(text, pack);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/banned_phrase/);
  });

  it('accepts evidence-grounded multi-sentence text without banned phrases', () => {
    const text = [
      'You both want real emotional closeness.',
      'Depth and presence matter in how you connect.',
      'That shared preference shows up clearly between you.',
      'It is a moderate overall fit with a sincere core.',
      'Starting a conversation here makes sense.',
    ].join(' ');
    expect(validateLlmNarrative(text, pack)).toEqual({ ok: true });
  });

  it('rejects too many sentences', () => {
    const many = Array.from(
      { length: 18 },
      (_, i) => `Sentence number ${i} about depth.`,
    ).join(' ');
    const r = validateLlmNarrative(many, pack);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/too_many/);
  });

  it('rejects ungrounded prose when evidence exists', () => {
    const text = [
      'The weather looks nice today for a walk outside.',
      'Coffee shops are busy in the afternoon hours.',
      'Trains sometimes run late on weekdays downtown.',
      'None of this mentions the match signals at all.',
      'Still five sentences of unrelated filler text.',
    ].join(' ');
    expect(validateLlmNarrative(text, pack)).toEqual({
      ok: false,
      reason: 'ungrounded',
    });
  });

  it('skips grounding when no traits, interests, or excerpts', () => {
    const emptyPack = buildMatchNarrativeFactPack({
      finalScore: 40,
      explainability: { positiveChips: [], reasonShort: 'thin' },
      traits: [],
    });
    const text =
      'Overall the picture is quiet. Little stands out yet. Still worth a careful read.';
    expect(validateLlmNarrative(text, emptyPack)).toEqual({ ok: true });
  });

  it('accepts prose grounded via profile excerpt tokens', () => {
    const packWithExcerpt = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: { positiveChips: [], reasonShort: 'thin' },
      traits: [],
      viewerAbout: {
        aboutMe:
          'Solitude and backpacking keep me honest about what I need from life.',
      },
    });
    const text = [
      'You both protect solitude like it matters.',
      'Backpacking shows up as a shared way to reset.',
      'That specific overlap makes the fit feel personal.',
      'Ask about a recent trail and see how the energy lands.',
    ].join(' ');
    expect(validateLlmNarrative(text, packWithExcerpt)).toEqual({ ok: true });
  });

  it('rejects invented biography when only excerpts provide grounding', () => {
    const packWithExcerpt = buildMatchNarrativeFactPack({
      finalScore: 55,
      explainability: { positiveChips: [], reasonShort: 'thin' },
      traits: [],
      viewerAbout: {
        aboutMe:
          'Solitude and backpacking keep me honest about what I need from life.',
      },
    });
    const text = [
      'You both secretly trained as concert pianists in Vienna.',
      'Your childhood yachts somehow overlap in surprising ways.',
      'None of this came from the listed facts or excerpts at all.',
      'Still four sentences of invented filler biography text.',
    ].join(' ');
    expect(validateLlmNarrative(text, packWithExcerpt)).toEqual({
      ok: false,
      reason: 'ungrounded',
    });
  });
});
