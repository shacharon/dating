import {
  extractLifestyleSignalsFromFreeText,
  LIFESTYLE_SIGNAL_TAGS,
  LIFESTYLE_SIGNAL_TAG_SET,
} from './lifestyle-signals-text.extract';

const ALL_TAGS = [
  'athletic_swimming',
  'outdoors_nature',
  'homebody',
  'social_friends',
  'fitness',
  'travel',
  'food',
  'nightlife',
  'pets',
  'reading',
  'gaming',
] as const;

describe('extractLifestyleSignalsFromFreeText (v1 + v2 taxonomy)', () => {
  it('exposes the canonical lifestyle tag allowlist (v1 + additive v2)', () => {
    expect([...LIFESTYLE_SIGNAL_TAGS]).toEqual([...ALL_TAGS]);
    expect(LIFESTYLE_SIGNAL_TAG_SET.size).toBe(11);
  });

  it('maps swimmer, swimming, pool, laps to athletic_swimming (evidence-based tokens)', () => {
    const samples = [
      'Competitive swimmer.',
      'I go swimming every morning.',
      'At the pool after work.',
      'I do laps before breakfast.',
    ];
    for (const aboutMe of samples) {
      const r = extractLifestyleSignalsFromFreeText({ aboutMe, aboutPartner: '' });
      expect(r.self.tags).toEqual(['athletic_swimming']);
      expect(r.self.evidence.some((e) => e.tag === 'athletic_swimming')).toBe(true);
    }
  });

  it('negation: does not tag athletic_swimming when swimming is explicitly negated', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I am not a swimmer and avoid the pool.',
      aboutPartner: '',
    });
    expect(r.self.tags).not.toContain('athletic_swimming');
  });

  it('phrase negation: outdoors_nature not tagged when hiking follows "not"', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I enjoy cities, not hiking in the mud.',
      aboutPartner: '',
    });
    expect(r.self.tags).not.toContain('outdoors_nature');
  });

  it('maps nature, outdoors, hiking, camping, parks to outdoors_nature', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Nature and the outdoors — hiking, camping, and city parks.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['outdoors_nature']);
    const phrases = r.self.evidence.map((e) => e.matchedPhrase);
    expect(phrases).toContain('nature');
    expect(phrases).toContain('outdoors');
    expect(phrases).toContain('hiking');
    expect(phrases).toContain('camping');
    expect(phrases).toContain('parks');
  });

  it('maps homebody, cozy at home, likes staying home to homebody', () => {
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'Total homebody.', aboutPartner: '' }).self.tags,
    ).toEqual(['homebody']);
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'I am cozy at home.', aboutPartner: '' }).self.evidence.some(
        (e) => e.matchedPhrase === 'cozy at home',
      ),
    ).toBe(true);
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'She likes staying home on weeknights.', aboutPartner: '' })
        .self.evidence.some((e) => e.matchedPhrase === 'likes staying home'),
    ).toBe(true);
  });

  it('maps loves friends, weekends with friends, social with friends to social_friends', () => {
    expect(
      extractLifestyleSignalsFromFreeText({
        aboutMe: '',
        aboutPartner: 'Someone who loves friends and is social with friends.',
      }).partner.evidence.map((e) => e.matchedPhrase),
    ).toEqual(expect.arrayContaining(['loves friends', 'social with friends']));

    const w = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Weekends with friends are the best.',
      aboutPartner: '',
    });
    expect(w.self.tags).toContain('social_friends');
    expect(w.self.evidence.some((e) => e.matchedPhrase === 'weekends with friends')).toBe(true);
  });

  it('keeps self vs partner scope isolated', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Hiking on Sundays.',
      aboutPartner: 'Swimmer preferred.',
    });
    expect(r.self.tags).toEqual(['outdoors_nature']);
    expect(r.partner.tags).toEqual(['athletic_swimming']);
  });

  it('allows multi-label when multiple themes match in one scope', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Swimming and hiking keep me balanced.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['athletic_swimming', 'outdoors_nature']);
  });

  it('fitness: positive gym / work out / yoga; negative not gym', () => {
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'I hit the gym four times a week.', aboutPartner: '' }).self
        .tags,
    ).toEqual(['fitness']);
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'Love yoga on the roof.', aboutPartner: '' }).self.tags,
    ).toContain('fitness');
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I am not a gym person — prefer walking.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('fitness');
  });

  it('travel: positive wanderlust / trip; negative not into travel', () => {
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'Wanderlust and weekend trips.', aboutPartner: '' }).self.tags,
    ).toEqual(['travel']);
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I am not into travel much; I like my city.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('travel');
  });

  it('food: positive foodie / cooking; negative not a foodie', () => {
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'Total foodie who loves brunch.', aboutPartner: '' }).self.tags,
    ).toEqual(expect.arrayContaining(['food']));
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I am not a foodie — simple meals only.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('food');
  });

  it('nightlife: positive nightclub / night out; negative not into nightlife', () => {
    expect(
      extractLifestyleSignalsFromFreeText({
        aboutMe: 'Nightclubs and a good night out.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['nightlife']));
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Not into nightlife; I prefer mornings.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('nightlife');
  });

  it('nightlife anti-collision: going out of town does not tag nightlife', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'We are going out of town next week.',
      aboutPartner: '',
    });
    expect(r.self.tags).not.toContain('nightlife');
  });

  it('pets: positive dog / animal lover; negative not a dog person', () => {
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'Dog mom and animal lover.', aboutPartner: '' }).self.tags,
    ).toEqual(expect.arrayContaining(['pets']));
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Not a dog person; reptiles only.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('pets');
  });

  it('reading: positive kindle / read a lot; negative not a big reader', () => {
    expect(
      extractLifestyleSignalsFromFreeText({ aboutMe: 'Kindle everywhere; read a lot.', aboutPartner: '' }).self.tags,
    ).toEqual(expect.arrayContaining(['reading']));
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I am not a big reader anymore.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('reading');
  });

  it('gaming: positive video games / gamer; negative not into gaming', () => {
    expect(
      extractLifestyleSignalsFromFreeText({
        aboutMe: 'PC gaming and video games on weekends.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(expect.arrayContaining(['gaming']));
    const neg = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Not into gaming or consoles.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('gaming');
  });

  it('gaming anti-collision: bare "game" in a novel title does not tag gaming', () => {
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'I love the game of chess and long novels.',
      aboutPartner: '',
    });
    expect(r.self.tags).not.toContain('gaming');
  });

  it('sparse: empty and non-matching text yield no tags', () => {
    expect(extractLifestyleSignalsFromFreeText({}).self.tags).toHaveLength(0);
    const r = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Looking for something real.',
      aboutPartner: null,
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toHaveLength(0);
  });
});
