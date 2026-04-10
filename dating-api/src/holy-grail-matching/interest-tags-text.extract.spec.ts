import {
  extractInterestTagsV1FromFreeText,
  INTEREST_TAGS_V1,
  INTEREST_TAG_V1_SET,
} from './interest-tags-text.extract';

describe('extractInterestTagsV1FromFreeText (v1 taxonomy)', () => {
  it('exposes only music and film', () => {
    expect(INTEREST_TAGS_V1).toEqual(['music', 'film']);
    expect(INTEREST_TAG_V1_SET.size).toBe(2);
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

  it('maps movies, films, cinema, netflix to film', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Movies, films, cinema nights, and Netflix.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['film']);
    const phrases = r.self.evidence.map((e) => e.matchedPhrase);
    expect(phrases).toContain('movies');
    expect(phrases).toContain('films');
    expect(phrases).toContain('cinema');
    expect(phrases).toContain('netflix');
  });

  it('allows multi-label when both music and film appear', () => {
    const r = extractInterestTagsV1FromFreeText({
      aboutMe: 'Concerts on Friday, films on Sunday.',
      aboutPartner: '',
    });
    expect(r.self.tags).toEqual(['music', 'film']);
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
