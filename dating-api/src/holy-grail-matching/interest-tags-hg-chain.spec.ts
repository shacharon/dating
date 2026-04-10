/**
 * Chain: free-text → `buildHolyGrailProfileMappingInputFromDbRow` → canonical map → HG rank + rankReasons (`interestTags`).
 */
import { MATCHING_CANONICAL_MODEL_VERSION } from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from './holy-grail-five-signal-ranking';
import { extractInterestTagsV1FromFreeText } from './interest-tags-text.extract';
import { mapProfileSourceToMatchingCanonical } from './profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromDbRow } from './retrieval/holy-grail-structured-db-json';

const EMPTY_EXTRACTION = {
  interests_self: [] as string[],
  interests: [] as string[],
  lifestyleTraits: [] as string[],
};

function mapFromProfileText(args: {
  profileId: string;
  aboutMe: string;
  aboutPartner: string;
}): MatchingCanonicalModel {
  const input = buildHolyGrailProfileMappingInputFromDbRow({
    profileId: args.profileId,
    extractionV2: EMPTY_EXTRACTION,
    holyGrailStructuredFacts: {},
    holyGrailStructuredPreferences: {},
    signalSelf: null,
    aboutMe: args.aboutMe,
    aboutPartner: args.aboutPartner,
  });
  return mapProfileSourceToMatchingCanonical(input);
}

describe('interestTags HG chain (extraction → rankingSignals → rank → explanation)', () => {
  it('merges self from aboutMe and partner from aboutPartner into rankingSignals', () => {
    const ext = extractInterestTagsV1FromFreeText({
      aboutMe: 'Vinyl collector.',
      aboutPartner: 'Enjoys cinema.',
    });
    expect(ext.self.tags).toEqual(['music']);
    expect(ext.partner.tags).toEqual(['film']);

    const m = mapFromProfileText({
      profileId: 'it-merge',
      aboutMe: 'Vinyl collector.',
      aboutPartner: 'Enjoys cinema.',
    });
    expect(m.rankingSignals?.interestTagsSelf).toEqual(['music']);
    expect(m.rankingSignals?.interestTagsPartner).toEqual(['film']);
  });

  it('sparse: no interest tag keys when text has no allowlisted matches', () => {
    const m = mapFromProfileText({
      profileId: 'it-sparse',
      aboutMe: 'Hi there.',
      aboutPartner: '',
    });
    expect(m.rankingSignals?.interestTagsSelf).toBeUndefined();
    expect(m.rankingSignals?.interestTagsPartner).toBeUndefined();
  });

  it('ranking impact: interest overlap raises rankScore vs same pair without interest tags', () => {
    const baseRs = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const withoutIt: MatchingCanonicalModel = {
      version: MATCHING_CANONICAL_MODEL_VERSION,
      profileId: 'it-s0',
      facts: {},
      preferences: {},
      searchOverrides: {},
      rankingSignals: { ...baseRs },
    };
    const candidate: MatchingCanonicalModel = {
      version: MATCHING_CANONICAL_MODEL_VERSION,
      profileId: 'it-c0',
      facts: {},
      preferences: {},
      searchOverrides: {},
      rankingSignals: {
        ...baseRs,
        interestTagsSelf: ['music'],
      },
    };
    const withIt: MatchingCanonicalModel = {
      ...withoutIt,
      rankingSignals: {
        ...baseRs,
        interestTagsPartner: ['music'],
      },
    };
    const r0 = computeHolyGrailFiveSignalRank({ searcher: withoutIt, candidate });
    const r1 = computeHolyGrailFiveSignalRank({ searcher: withIt, candidate });
    expect(r1.rankScore).toBeGreaterThan(r0.rankScore);
    expect(r1.rankBreakdown.some((b) => b.signal === 'interestTags')).toBe(true);
    expect(r0.rankBreakdown.some((b) => b.signal === 'interestTags')).toBe(false);
  });

  it('explanation output: rankReasons includes interestTags line with grounded tags only', () => {
    const searcher = mapFromProfileText({
      profileId: 'it-s-exp',
      aboutMe: '',
      aboutPartner: 'Someone who loves live music.',
    });
    const candidate = mapFromProfileText({
      profileId: 'it-c-exp',
      aboutMe: 'Concerts and playlists every weekend.',
      aboutPartner: 'Netflix and movies.',
    });
    const r = computeHolyGrailFiveSignalRank({ searcher, candidate });
    const line = r.rankReasons.find((x) => x.startsWith('interestTags:'));
    expect(line).toBeDefined();
    expect(line).toContain('interestTags:grounded(');
    expect(line).toContain('music');
    expect(line).not.toContain('film');
    const row = r.rankBreakdown.find((b) => b.signal === 'interestTags');
    expect(row?.note.startsWith('interestTags:grounded(')).toBe(true);
    expect(row?.note).toContain('music');
    expect(row?.note).not.toContain('film');
  });
});
