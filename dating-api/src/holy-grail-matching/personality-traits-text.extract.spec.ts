import {
  extractPersonalityTraitsFromFreeText,
  PERSONALITY_TRAIT_TAG_SET,
  PERSONALITY_TRAIT_TAGS,
} from './personality-traits-text.extract';

describe('extractPersonalityTraitsFromFreeText', () => {
  it('exposes only canonical v1 personality trait tags', () => {
    expect(PERSONALITY_TRAIT_TAGS).toEqual(['humor_playful', 'honesty_integrity']);
    expect(PERSONALITY_TRAIT_TAG_SET.size).toBe(2);
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

  it('allows multi-label when both humor and honesty evidence exist', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: 'Funny and honest.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['humor_playful', 'honesty_integrity']);
  });

  it('does not guess: empty text yields no tags', () => {
    const r = extractPersonalityTraitsFromFreeText({
      aboutMe: '   ',
      aboutPartner: null,
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toHaveLength(0);
  });

  it('blocks simple negation for negatable single words', () => {
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
