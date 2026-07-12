import {
  extractInterestTagsV1FromFreeText,
  INTEREST_TAGS,
  INTEREST_TAGS_V1,
  INTEREST_TAG_SET,
  INTEREST_TAG_V1_SET,
} from './interest-tags-text.extract';

const ALL_TAGS = [
  'music',
  'film',
  'books_reading',
  'sports_fitness',
  'art_visual',
  'gaming',
  'food_dining',
  'travel',
  'photography',
  'technology',
] as const;

describe('extractInterestTagsV1FromFreeText (v1 + v2 allowlist)', () => {
  it('exposes v1 subset and full canonical allowlist', () => {
    expect(INTEREST_TAGS_V1).toEqual(['music', 'film']);
    expect([...INTEREST_TAGS]).toEqual([...ALL_TAGS]);
    expect(INTEREST_TAG_SET.size).toBe(10);
    expect(INTEREST_TAG_V1_SET).toBe(INTEREST_TAG_SET);
  });

  it('maps music vocabulary to self from aboutMe', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Love live music and vinyl.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['music']);
    expect(r.partner.tags).toHaveLength(0);
  });

  it('maps music, concerts, playlists, instruments to music (allowlisted tokens)', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Into music, concerts, curated playlists, and instruments.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['music']);
    const phrases = r.self.evidence.map((e) => e.matchedPhrase);
    expect(phrases).toContain('music');
    expect(phrases).toContain('concerts');
    expect(phrases).toContain('playlists');
    expect(phrases).toContain('instruments');
  });

  it('maps film vocabulary to partner from aboutPartner', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: '',
      aboutPartner: 'Someone who enjoys movies and cinema.',
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toEqual(['film']);
  });

  it('allows multi-label when both music and film appear', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Concerts on Friday, films on Sunday.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['music', 'film']);
  });

  it('books_reading: novels and reading; negation', () => {
    expect(
      extractInterestTagsV1FromFreeText({
        aboutMe: 'Novels, book club, and audiobooks on repeat.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(['books_reading']);
    const neg = extractInterestTagsV1FromFreeText({
      aboutMe: 'I am not into reading this year.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('books_reading');
  });

  it('sports_fitness: soccer and marathon; negation', () => {
    expect(
      extractInterestTagsV1FromFreeText({
        aboutMe: 'Soccer on Sundays and a spring marathon.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(['sports_fitness']);
    const neg = extractInterestTagsV1FromFreeText({
      aboutMe: 'Not into sports or running anymore.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('sports_fitness');
  });

  it('art_visual: gallery and art; not art director collision', () => {
    const pos = extractInterestTagsV1FromFreeText({
      aboutMe: 'Gallery nights and modern art.',
      aboutPartner: '',
    });
    expect(pos.self.tags).toContain('art_visual');
    const neg = extractInterestTagsV1FromFreeText({
      aboutMe: 'I work as an art director in advertising.',
      aboutPartner: '',
    });
    expect(neg.self.evidence.filter((e) => e.matchedPhrase === 'art')).toHaveLength(0);
  });

  it('gaming: video games and board games; not bare game', () => {
    expect(
      extractInterestTagsV1FromFreeText({
        aboutMe: 'Video games on weekends and board games with friends.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(['gaming']);
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'I enjoy the game of chess and long novels.',
      aboutPartner: '',
    });
    expect(r.self.tags).not.toContain('gaming');
  });

  it('food_dining: cooking and brunch; negation', () => {
    expect(
      extractInterestTagsV1FromFreeText({
        aboutMe: 'Love cooking, brunch, and trying new cuisine.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(['food_dining']);
    const neg = extractInterestTagsV1FromFreeText({
      aboutMe: 'Simple meals only; not cooking elaborate recipes.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('food_dining');
  });

  it('travel: wanderlust and trips; negation', () => {
    expect(
      extractInterestTagsV1FromFreeText({
        aboutMe: 'Wanderlust, passport stamps, and weekend trips.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(['travel']);
    const neg = extractInterestTagsV1FromFreeText({
      aboutMe: 'Not into travel much; homebody city life.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('travel');
  });

  it('photography: camera and dslr', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Photography hobby with a DSLR and weekend shoots.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['photography']);
  });

  it('technology: coding and open source; negation', () => {
    expect(
      extractInterestTagsV1FromFreeText({
        aboutMe: 'Software engineer into coding and open source.',
        aboutPartner: '',
      }).self.tags,
    ).toEqual(['technology']);
    const neg = extractInterestTagsV1FromFreeText({
      aboutMe: 'I am not into technology or coding professionally.',
      aboutPartner: '',
    });
    expect(neg.self.tags).not.toContain('technology');
  });

  it('keeps self vs partner scope isolated', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'I play in a band.',
      aboutPartner: 'Film buff preferred.',
    });
    expect(r.self.tags).toEqual(['music']);
    expect(r.partner.tags).toEqual(['film']);
  });

  it('sparse: no tags when nothing matches', () => {
    expect(extractInterestTagsV1FromFreeText({}).self.tags).toHaveLength(0);
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Kind and loyal.',
      aboutPartner: null,
    });
    expect(r.self.tags).toHaveLength(0);
    expect(r.partner.tags).toHaveLength(0);
  });
});
