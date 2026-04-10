/**
 * Chain: free-text → `buildHolyGrailProfileMappingInputFromDbRow` → canonical map → HG rank + rankReasons (lifestyleSignals).
 */
import { MATCHING_CANONICAL_MODEL_VERSION } from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from './holy-grail-five-signal-ranking';
import { extractLifestyleSignalsFromFreeText } from './lifestyle-signals-text.extract';
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

describe('lifestyleSignals HG chain (extraction → rankingSignals → rank → explanation)', () => {
  it('merges self from aboutMe and partner from aboutPartner into rankingSignals', () => {
    const ext = extractLifestyleSignalsFromFreeText({
      aboutMe: 'Swimming on Tuesdays.',
      aboutPartner: 'Hiking buddy welcome.',
    });
    expect(ext.self.tags).toEqual(['athletic_swimming']);
    expect(ext.partner.tags).toEqual(['outdoors_nature']);

    const m = mapFromProfileText({
      profileId: 'ls-merge',
      aboutMe: 'Swimming on Tuesdays.',
      aboutPartner: 'Hiking buddy welcome.',
    });
    expect(m.rankingSignals?.lifestyleSignalsSelf).toEqual(['athletic_swimming']);
    expect(m.rankingSignals?.lifestyleSignalsPartner).toEqual(['outdoors_nature']);
  });

  it('sparse: no lifestyle keys when text has no allowlisted matches', () => {
    const m = mapFromProfileText({
      profileId: 'ls-sparse',
      aboutMe: 'Hello.',
      aboutPartner: '',
    });
    expect(m.rankingSignals?.lifestyleSignalsSelf).toBeUndefined();
    expect(m.rankingSignals?.lifestyleSignalsPartner).toBeUndefined();
  });

  it('ranking impact: lifestyle overlap raises rankScore vs same pair without lifestyle tags', () => {
    const baseRs = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const withoutLs: MatchingCanonicalModel = {
      version: MATCHING_CANONICAL_MODEL_VERSION,
      profileId: 'ls-s0',
      facts: {},
      preferences: {},
      searchOverrides: {},
      rankingSignals: { ...baseRs },
    };
    const candidate: MatchingCanonicalModel = {
      version: MATCHING_CANONICAL_MODEL_VERSION,
      profileId: 'ls-c0',
      facts: {},
      preferences: {},
      searchOverrides: {},
      rankingSignals: {
        ...baseRs,
        lifestyleSignalsSelf: ['outdoors_nature'],
      },
    };
    const withLs: MatchingCanonicalModel = {
      ...withoutLs,
      rankingSignals: {
        ...baseRs,
        lifestyleSignalsPartner: ['outdoors_nature'],
      },
    };
    const r0 = computeHolyGrailFiveSignalRank({ searcher: withoutLs, candidate });
    const r1 = computeHolyGrailFiveSignalRank({ searcher: withLs, candidate });
    expect(r1.rankScore).toBeGreaterThan(r0.rankScore);
    expect(r1.rankBreakdown.some((b) => b.signal === 'lifestyleSignals')).toBe(true);
    expect(r0.rankBreakdown.some((b) => b.signal === 'lifestyleSignals')).toBe(false);
  });

  it('explanation output: rankReasons includes lifestyleSignals line with grounded tags only', () => {
    const searcher = mapFromProfileText({
      profileId: 'ls-s-exp',
      aboutMe: '',
      aboutPartner: 'Love hiking and camping.',
    });
    const candidate = mapFromProfileText({
      profileId: 'ls-c-exp',
      aboutMe: 'Hiking and camping most weekends.',
      aboutPartner: '',
    });
    const r = computeHolyGrailFiveSignalRank({ searcher, candidate });
    const line = r.rankReasons.find((x) => x.startsWith('lifestyleSignals:'));
    expect(line).toBeDefined();
    expect(line).toContain('lifestyleSignals:grounded(');
    expect(line).toContain('outdoors_nature');
    const row = r.rankBreakdown.find((b) => b.signal === 'lifestyleSignals');
    expect(row?.note.startsWith('lifestyleSignals:grounded(')).toBe(true);
    expect(row?.note).toContain('O=');
  });
});
