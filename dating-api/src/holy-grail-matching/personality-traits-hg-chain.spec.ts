/**
 * Chain: free-text → `buildHolyGrailProfileMappingInputFromDbRow` → canonical map → HG rank + rankReasons.
 */
import { MATCHING_CANONICAL_MODEL_VERSION } from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from './holy-grail-five-signal-ranking';
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

describe('personalityTraits HG chain (extraction → rankingSignals → rank → explanation)', () => {
  it('merges self scope from aboutMe and partner scope from aboutPartner into rankingSignals', () => {
    const m = mapFromProfileText({
      profileId: 'p-scope',
      aboutMe: 'I am playful and witty.',
      aboutPartner: 'No liars please.',
    });
    expect(m.rankingSignals?.personalityTraitsSelf).toEqual(['humor_playful']);
    expect(m.rankingSignals?.personalityTraitsPartner).toEqual(['honesty_integrity']);
  });

  it('sparse: no personality keys when free text has no allowlisted matches', () => {
    const m = mapFromProfileText({
      profileId: 'p-sparse',
      aboutMe: 'Hi.',
      aboutPartner: '',
    });
    expect(m.rankingSignals?.personalityTraitsSelf).toBeUndefined();
    expect(m.rankingSignals?.personalityTraitsPartner).toBeUndefined();
  });

  it('ranking impact: overlap raises rankScore vs same pair without personality traits', () => {
    const baseRs = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const withoutPersonality: MatchingCanonicalModel = {
      version: MATCHING_CANONICAL_MODEL_VERSION,
      profileId: 's0',
      facts: {},
      preferences: {},
      searchOverrides: {},
      rankingSignals: { ...baseRs },
    };
    const candidate: MatchingCanonicalModel = {
      version: MATCHING_CANONICAL_MODEL_VERSION,
      profileId: 'c0',
      facts: {},
      preferences: {},
      searchOverrides: {},
      rankingSignals: {
        ...baseRs,
        personalityTraitsSelf: ['honesty_integrity'],
      },
    };
    const withPersonality: MatchingCanonicalModel = {
      ...withoutPersonality,
      rankingSignals: {
        ...baseRs,
        personalityTraitsPartner: ['honesty_integrity'],
      },
    };
    const r0 = computeHolyGrailFiveSignalRank({
      searcher: withoutPersonality,
      candidate,
    });
    const r1 = computeHolyGrailFiveSignalRank({
      searcher: withPersonality,
      candidate,
    });
    expect(r1.rankScore).toBeGreaterThan(r0.rankScore);
    expect(r1.rankBreakdown.some((b) => b.signal === 'personalityTraits')).toBe(true);
    expect(r0.rankBreakdown.some((b) => b.signal === 'personalityTraits')).toBe(false);
  });

  it('explanation output: rankReasons includes personalityTraits line with grounded note only', () => {
    const searcher = mapFromProfileText({
      profileId: 's-exp',
      aboutMe: '',
      aboutPartner: 'I want someone honest.',
    });
    const candidate = mapFromProfileText({
      profileId: 'c-exp',
      aboutMe: 'I am honest and straightforward.',
      aboutPartner: '',
    });
    const r = computeHolyGrailFiveSignalRank({ searcher, candidate });
    const line = r.rankReasons.find((x) => x.startsWith('personalityTraits:'));
    expect(line).toBeDefined();
    expect(line).toContain('grounded(honesty_integrity');
    expect(line).toMatch(/O=1\.0000/);
    const row = r.rankBreakdown.find((b) => b.signal === 'personalityTraits');
    expect(row?.note.startsWith('personalityTraits:grounded(')).toBe(true);
  });
});
