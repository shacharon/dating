import {
  extractPersonalityTraitsFromFreeText,
  PERSONALITY_TRAIT_TAG_SET,
  PERSONALITY_TRAIT_TAGS,
} from './personality-traits-text.extract';

const ALL_TAGS = [
  'humor_playful',
  'honesty_integrity',
  'kind_empathetic',
  'ambitious_driven',
  'calm_steady',
  'curious_open_minded',
  'loyal_committed',
  'optimistic_positive',
  'introverted_reflective',
  'extroverted_social',
] as const;

describe('extractPersonalityTraitsFromFreeText (v1 + v2)', () => {
  it('exposes canonical personality trait allowlist (v1 + additive v2)', () => {
    expect([...PERSONALITY_TRAIT_TAGS]).toEqual([...ALL_TAGS]);
    expect(PERSONALITY_TRAIT_TAG_SET.size).toBe(10);
  });

  it('maps humor vocabulary to humor_playful on self (aboutMe)', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'I am funny, humorous, and a bit witty — playful energy.',
      aboutPartner: '',
    });
    expect(r.self.tags).toContain('humor_playful');
    expect(r.self.tags).not.toContain('honesty_integrity');
    expect(r.self.evidence.map((e) => e.matchedPhrase).sort()).toEqual(
      ['funny', 'humorous', 'playful', 'witty'].sort(),
    );
    expect(r.partner.tags).toHaveLength(0);
  });

  it('maps honesty vocabulary to honesty_integrity on self', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'I try to be honest, truthful, straightforward, and transparent.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['honesty_integrity']);
    expect(r.self.evidence.map((e) => e.matchedPhrase).sort()).toEqual(
      ['honest', 'straightforward', 'transparent', 'truthful'].sort(),
    );
  });

  it('maps anti-liar and honesty-seeking phrases to partner + honesty_integrity', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: '',
      aboutPartner: 'No liars. I am tired of liars and wants honesty.',
    });
    expect(r.partner.tags).toEqual(['honesty_integrity']);
    expect(r.partner.evidence.map((e) => e.matchedPhrase).sort()).toEqual(
      ['no liars', 'tired of liars', 'wants honesty'].sort(),
    );
  });

  it('phrase negation: honesty phrase after not does not tag', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'I am not looking for honesty games.',
      aboutPartner: '',
    });
    expect(r.self.tags).not.toContain('honesty_integrity');
  });

  it('allows multi-label when both humor and honesty evidence exist', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Funny and honest.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['humor_playful', 'honesty_integrity']);
  });

  it('kind_empathetic: kind / kindness / compassionate; not kind of idiom; negation', () => {
    expect(
      extractPersonalityTraitsFromFreeText({ aboutMe: 'Kind heart and compassionate.', aboutPartner: '' }).self.tags,
    ).toEqual(expect.arrayContaining(['kind_empathetic']));
    const idiom = extractPersonalityTraitsFromFreeText({
      aboutMe: 'I am kind of sarcastic but caring.',
      aboutPartner: '',
    });
    expect(idiom.self.tags).toContain('kind_empathetic');
    expect(idiom.self.evidence.some((e) => e.matchedPhrase === 'kind')).toBe(false);
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not a kind soul; rough edges.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('kind_empathetic');
  });

  it('ambitious_driven: motivated and goal-oriented; negation', () => {
    expect(
      extractPersonalityTraitsFromFreeText({
        aboutMe: 'Ambitious, driven, goal-oriented professional.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['ambitious_driven']));
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not ambitious; coasting is fine.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('ambitious_driven');
  });

  it('calm_steady: calm, patient, easy going; negation', () => {
    expect(
      extractPersonalityTraitsFromFreeText({
        aboutMe: 'Calm and patient; easy going.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['calm_steady']));
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not patient with flaky people.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('calm_steady');
  });

  it('curious_open_minded: curious and open-minded; negation', () => {
    expect(
      extractPersonalityTraitsFromFreeText({
        aboutMe: 'Curious and open minded about new ideas.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['curious_open_minded']));
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not curious about drama.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('curious_open_minded');
  });

  it('loyal_committed: loyal and reliable; negation', () => {
    expect(
      extractPersonalityTraitsFromFreeText({
        aboutMe: 'Loyal, dependable, reliable friend.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['loyal_committed']));
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not loyal to toxic exes.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('loyal_committed');
  });

  it('optimistic_positive: optimistic and positive outlook; negation', () => {
    expect(
      extractPersonalityTraitsFromFreeText({
        aboutMe: 'Optimistic with a positive outlook.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['optimistic_positive']));
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not optimistic about dating apps.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('optimistic_positive');
  });

  it('introverted_reflective vs extroverted_social; negation on introvert', () => {
    const both = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Outgoing at work but reflective at home.',
      aboutPartner: '',
    });
    expect(both.self.tags).toEqual(
      expect.arrayContaining(['extroverted_social', 'introverted_reflective']),
    );
    const neg = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Not introverted; I recharge with people.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('introverted_reflective');
  });

  it('does not guess: empty text yields no tags', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: '   ',
      aboutPartner: null,
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toHaveLength(0);
  });

  it('blocks scoped negation for negatable single words (humor + honesty)', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'I am not funny and not honest.',
      aboutPartner: '',
    });
    expect(r.self.tags).toHaveLength(0);
  });

  it('self vs partner scope: aboutPartner humor does not populate self.tags', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: '',
      aboutPartner: 'Looking for someone funny and playful.',
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toEqual(['humor_playful']);
    expect(r.partner.evidence.some((e) => e.tag === 'humor_playful')).toBe(true);
  });

  it('self vs partner scope: aboutMe honesty does not populate partner.tags', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'I value honesty.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['honesty_integrity']);
    expect(r.partner.tags).toHaveLength(0);
  });

  it('sparse: undefined fields behave like empty (no tags)', () => {
    const r = extractPersonalityTraitsFromFreeText({});
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toHaveLength(0);
    expect(r.self.evidence).toHaveLength(0);
    expect(r.partner.evidence).toHaveLength(0);
  });

  it('sparse: generic dating text without allowlisted tokens yields no tags', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Looking for love and good vibes only.',
      aboutPartner: 'Someone nice.',
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toHaveLength(0);
  });
});
