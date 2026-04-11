import { MATCHING_CANONICAL_MODEL_VERSION } from '../canonical/matching-canonical.types';
import type { MatchingCanonicalModel } from '../canonical/matching-canonical.types';
import {
  computeHolyGrailFiveSignalRank,
  computeHolyGrailRankingPurityRank,
  deterministicRankingSpread,
} from './holy-grail-five-signal-ranking';

function model(
  profileId: string,
  rs: NonNullable<MatchingCanonicalModel['rankingSignals']>,
  prefs?: MatchingCanonicalModel['preferences'],
): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: {},
    preferences: prefs ?? {},
    searchOverrides: {},
    rankingSignals: rs,
  };
}

describe('computeHolyGrailRankingPurityRank', () => {
  it('ignores similarityPreference overlay included in computeHolyGrailFiveSignalRank', () => {
    const rs = {
      dailyRhythm: 'dr',
      autonomyTogetherness: 'at',
      conflictStyle: 5,
      lifestylePace: 5,
      interestsTop: ['a', 'b'],
    } as const;
    const searcher = model('s', { ...rs }, { similarityPreference: 'similar' });
    const candidate = model('c', { ...rs });
    const pure = computeHolyGrailRankingPurityRank({ searcher, candidate });
    const full = computeHolyGrailFiveSignalRank({ searcher, candidate });
    expect(pure.rankBreakdown.some((b) => b.signal === 'similarityPreference')).toBe(false);
    expect(full.rankBreakdown.some((b) => b.signal === 'similarityPreference')).toBe(true);
    expect(full.rankScore).toBeGreaterThan(pure.rankScore);
  });
});

describe('computeHolyGrailFiveSignalRank', () => {
  it('full match yields 100', () => {
    const rs = {
      dailyRhythm: 'dr',
      autonomyTogetherness: 'at',
      conflictStyle: 7,
      lifestylePace: 3,
      interestsTop: ['a', 'b'],
    } as const;
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s', { ...rs }),
      candidate: model('c', { ...rs }),
    });
    expect(r.rankScore).toBe(100);
  });

  it('numeric gap scales linearly to weight', () => {
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s', {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: 10,
        lifestylePace: null,
        interestsTop: [],
      }),
      candidate: model('c', {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: 12,
        lifestylePace: null,
        interestsTop: [],
      }),
    });
    expect(r.rankBreakdown.find((b) => b.signal === 'conflictStyle')?.points).toBeCloseTo(17.6, 5);
  });

  it('interestsTop uses Jaccard |A∩B|/|A∪B|', () => {
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s', {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: ['x', 'y', 'z'],
      }),
      candidate: model('c', {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: ['x', 'a'],
      }),
    });
    expect(r.rankBreakdown.find((b) => b.signal === 'interestsTop')?.points).toBeCloseTo(
      (1 / 4) * 22,
      5,
    );
  });

  it('deterministicRankingSpread is stable and in (0, EMPTY_SPREAD_MAX]', () => {
    const x = deterministicRankingSpread('searcher-1', 'cand-9');
    const y = deterministicRankingSpread('searcher-1', 'cand-9');
    expect(x).toBe(y);
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThanOrEqual(2.5);
  });

  it('all-empty snapshots get spread breakdown only as sixth row and non-zero total', () => {
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s', {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: [],
      }),
      candidate: model('z9', {
        dailyRhythm: null,
        autonomyTogetherness: null,
        conflictStyle: null,
        lifestylePace: null,
        interestsTop: [],
      }),
    });
    expect(r.rankScore).toBeGreaterThan(0);
    expect(r.rankBreakdown).toHaveLength(6);
    expect(r.rankBreakdown[5].signal).toBe('deterministicSpread');
  });

  it('similarityPreference similar adds positive Δ when pairwise overlap is high', () => {
    const rs = {
      dailyRhythm: 'dr',
      autonomyTogetherness: 'at',
      conflictStyle: 7,
      lifestylePace: 3,
      interestsTop: ['a', 'b'],
    } as const;
    const base = computeHolyGrailFiveSignalRank({
      searcher: model('s', { ...rs }),
      candidate: model('c', { ...rs }),
    });
    const withPref = computeHolyGrailFiveSignalRank({
      searcher: model('s', { ...rs }, { similarityPreference: 'similar' }),
      candidate: model('c', { ...rs }),
    });
    expect(base.rankScore).toBe(100);
    expect(withPref.rankBreakdown.some((b) => b.signal === 'similarityPreference')).toBe(true);
    const simRow = withPref.rankBreakdown.find((b) => b.signal === 'similarityPreference');
    expect(simRow?.points).toBeCloseTo(2.5, 5);
    expect(simRow?.note).toContain('reward_overlap');
    expect(withPref.rankScore).toBeGreaterThan(100);
  });

  it('similarityPreference different penalizes high overlap (negative Δ)', () => {
    const rs = {
      dailyRhythm: 'x',
      autonomyTogetherness: 'y',
      conflictStyle: 5,
      lifestylePace: 5,
      interestsTop: ['t'],
    } as const;
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s1', { ...rs }, { similarityPreference: 'different' }),
      candidate: model('c1', { ...rs }),
    });
    const simRow = r.rankBreakdown.find((b) => b.signal === 'similarityPreference');
    expect(simRow?.note).toContain('reward_contrast');
    expect(simRow?.points).toBeLessThan(0);
  });

  it('similarityPreference balanced uses reward_mid_overlap with positive Δ at moderate O', () => {
    const s = {
      dailyRhythm: 'd',
      autonomyTogetherness: 'a',
      conflictStyle: 5,
      lifestylePace: 5,
      interestsTop: ['x'],
    } as const;
    const c = {
      dailyRhythm: 'd',
      autonomyTogetherness: 'b',
      conflictStyle: 5,
      lifestylePace: 5,
      interestsTop: ['y'],
    } as const;
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('sb', s, { similarityPreference: 'balanced' }),
      candidate: model('cm', c),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'similarityPreference');
    expect(row?.note).toContain('reward_mid_overlap');
    expect(row!.points).toBeGreaterThan(0);
  });

  it('label mismatch earns partial credit vs both missing', () => {
    const base = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const miss = computeHolyGrailFiveSignalRank({
      searcher: model('s', { ...base, dailyRhythm: 'a' }),
      candidate: model('c', { ...base, dailyRhythm: 'b' }),
    });
    const bothMissing = computeHolyGrailFiveSignalRank({
      searcher: model('s', { ...base }),
      candidate: model('c', { ...base }),
    });
    expect(miss.rankScore).toBeGreaterThan(bothMissing.rankScore);
    expect(miss.rankBreakdown[0].note).toContain('mismatch_partial');
  });

  it('personalityTraits adds bonus; note lists only intersecting grounded tags', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('sp', {
        ...empty,
        personalityTraitsPartner: ['honesty_integrity'],
      }),
      candidate: model('cs', {
        ...empty,
        personalityTraitsSelf: ['honesty_integrity', 'humor_playful'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'personalityTraits');
    expect(row).toBeDefined();
    expect(row!.note).toMatch(/grounded\(honesty_integrity/);
    expect(row!.note).not.toContain('humor_playful');
    // Jaccard partner×self = 1/2 (candidate also has humor_playful) → 2 × 0.5 = 1
    expect(row!.points).toBeCloseTo(1, 5);
  });

  it('personalityTraits emits no row when canonical traits never intersect', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s2', {
        ...empty,
        personalityTraitsPartner: ['honesty_integrity'],
      }),
      candidate: model('c2', {
        ...empty,
        personalityTraitsSelf: ['humor_playful'],
      }),
    });
    expect(r.rankBreakdown.some((b) => b.signal === 'personalityTraits')).toBe(false);
    expect(r.rankReasons.some((line) => line.startsWith('personalityTraits:'))).toBe(false);
  });

  it('personalityTraits sparse: no row when only searcher has partner traits (candidate self empty)', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s-sparse', {
        ...empty,
        personalityTraitsPartner: ['honesty_integrity'],
      }),
      candidate: model('c-sparse', { ...empty }),
    });
    expect(r.rankBreakdown.some((b) => b.signal === 'personalityTraits')).toBe(false);
  });

  it('personalityTraits explanation: rankReasons encodes breakdown note for consumers', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('sx', {
        ...empty,
        personalityTraitsPartner: ['humor_playful'],
      }),
      candidate: model('cx', {
        ...empty,
        personalityTraitsSelf: ['humor_playful'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'personalityTraits');
    expect(row).toBeDefined();
    const reasonLine = r.rankReasons.find((x) => x.startsWith('personalityTraits:'));
    expect(reasonLine).toBeDefined();
    expect(reasonLine).toContain(row!.note);
  });

  it('personalityTraits v2: grounded note lists only true intersections (extra v2 self tags omitted)', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('s-pt-v2', {
        ...empty,
        personalityTraitsPartner: ['kind_empathetic'],
      }),
      candidate: model('c-pt-v2', {
        ...empty,
        personalityTraitsSelf: ['kind_empathetic', 'ambitious_driven'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'personalityTraits');
    expect(row).toBeDefined();
    expect(row!.note).toMatch(/grounded\(kind_empathetic/);
    expect(row!.note).not.toContain('ambitious_driven');
  });

  it('lifestyleSignals adds bonus; note lists only intersecting lifestyle tags', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('ls-s', {
        ...empty,
        lifestyleSignalsPartner: ['outdoors_nature'],
      }),
      candidate: model('ls-c', {
        ...empty,
        lifestyleSignalsSelf: ['outdoors_nature', 'athletic_swimming'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'lifestyleSignals');
    expect(row).toBeDefined();
    expect(row!.note).toMatch(/lifestyleSignals:grounded\(outdoors_nature/);
    expect(row!.note).not.toContain('athletic_swimming');
    expect(row!.points).toBeCloseTo(1, 5);
  });

  it('lifestyleSignals emits no row when lifestyle tags do not intersect', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('ls2-s', {
        ...empty,
        lifestyleSignalsPartner: ['homebody'],
      }),
      candidate: model('ls2-c', {
        ...empty,
        lifestyleSignalsSelf: ['social_friends'],
      }),
    });
    expect(r.rankBreakdown.some((b) => b.signal === 'lifestyleSignals')).toBe(false);
  });

  it('lifestyleSignals rankReason line mentions only grounded tags from note', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('ls3-s', {
        ...empty,
        lifestyleSignalsPartner: ['athletic_swimming'],
      }),
      candidate: model('ls3-c', {
        ...empty,
        lifestyleSignalsSelf: ['athletic_swimming'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'lifestyleSignals');
    const line = r.rankReasons.find((x) => x.startsWith('lifestyleSignals:'));
    expect(line).toContain(row!.note);
    expect(row!.note).toMatch(/grounded\(athletic_swimming,O=1\.0000\)/);
  });

  it('interestTags adds bonus; note lists only intersecting canonical interest tags', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('it-s', {
        ...empty,
        interestTagsPartner: ['music'],
      }),
      candidate: model('it-c', {
        ...empty,
        interestTagsSelf: ['music', 'film'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'interestTags');
    expect(row).toBeDefined();
    expect(row!.note).toMatch(/interestTags:grounded\(music/);
    expect(row!.note).not.toContain('film');
    expect(row!.points).toBeCloseTo(1, 5);
  });

  it('interestTags emits no row when canonical interest tags do not intersect', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('it2-s', {
        ...empty,
        interestTagsPartner: ['music'],
      }),
      candidate: model('it2-c', {
        ...empty,
        interestTagsSelf: ['film'],
      }),
    });
    expect(r.rankBreakdown.some((b) => b.signal === 'interestTags')).toBe(false);
  });

  it('interestTags rankReason line embeds grounded note', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('it3-s', {
        ...empty,
        interestTagsPartner: ['film'],
      }),
      candidate: model('it3-c', {
        ...empty,
        interestTagsSelf: ['film'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'interestTags');
    const line = r.rankReasons.find((x) => x.startsWith('interestTags:'));
    expect(line).toContain(row!.note);
    expect(row!.note).toMatch(/grounded\(film,O=1\.0000\)/);
  });

  it('interestTags v2 grounded note lists only intersecting allowlist ids', () => {
    const empty = {
      dailyRhythm: null,
      autonomyTogetherness: null,
      conflictStyle: null,
      lifestylePace: null,
      interestsTop: [] as string[],
    };
    const r = computeHolyGrailFiveSignalRank({
      searcher: model('itv2-s', {
        ...empty,
        interestTagsPartner: ['travel', 'music'],
      }),
      candidate: model('itv2-c', {
        ...empty,
        interestTagsSelf: ['travel', 'gaming'],
      }),
    });
    const row = r.rankBreakdown.find((b) => b.signal === 'interestTags');
    expect(row).toBeDefined();
    expect(row!.note).toMatch(/interestTags:grounded\(travel/);
    expect(row!.note).not.toContain('gaming');
    expect(row!.note).not.toContain('music');
  });
});
