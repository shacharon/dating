import {
  buildExpansion12ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-12-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion12ShadowBreakdown', () => {
  it('builds entry with pairScore >= 7 when both sides are high on emotionalExpression', () => {
    const breakdown = buildExpansion12ShadowBreakdown(
      { emotionalExpression: 8 },
      { emotionalExpression: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('emotionalExpression');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('builds entry when both sides are low-aligned on emotionalExpression', () => {
    const breakdown = buildExpansion12ShadowBreakdown(
      { emotionalExpression: 2 },
      { emotionalExpression: 2 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('emotionalExpression');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('skips emotionalExpression when either side is null', () => {
    expect(
      buildExpansion12ShadowBreakdown(
        { emotionalExpression: 8 },
        { emotionalExpression: null },
      ),
    ).toEqual([]);
  });

  it('skips non-finite emotionalExpression values', () => {
    expect(
      buildExpansion12ShadowBreakdown(
        { emotionalExpression: Number.NaN },
        { emotionalExpression: 8 },
      ),
    ).toEqual([]);
  });

  it('emits synthetic listeningFeelsHeard when both listeningPresence >= 7', () => {
    const breakdown = buildExpansion12ShadowBreakdown(
      { listeningPresence: 8 },
      { listeningPresence: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('listeningFeelsHeard');
    expect(breakdown[0].pairScore).toBe(10);
  });

  it('emits synthetic listeningFeelsHeard at boundary (both >= 7)', () => {
    const breakdown = buildExpansion12ShadowBreakdown(
      { listeningPresence: 7 },
      { listeningPresence: 7 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('listeningFeelsHeard');
  });

  it('does not emit synthetic chip when both listeningPresence are low', () => {
    expect(
      buildExpansion12ShadowBreakdown(
        { listeningPresence: 2 },
        { listeningPresence: 3 },
      ),
    ).toEqual([]);
  });

  it('does not emit synthetic chip on listening gap', () => {
    expect(
      buildExpansion12ShadowBreakdown(
        { listeningPresence: 9 },
        { listeningPresence: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit synthetic chip when one side is below 7', () => {
    expect(
      buildExpansion12ShadowBreakdown(
        { listeningPresence: 6 },
        { listeningPresence: 7 },
      ),
    ).toEqual([]);
  });

  it('exposes exact chip map labels', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.emotionalExpression).toBe(
      'Expressiveness match',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.listeningFeelsHeard).toBe(
      'Feels heard',
    );
  });
});

describe('Expansion-12 shadow positive chips', () => {
  it('pickPositiveChips includes Expressiveness match from high emotionalExpression', () => {
    const chips = pickPositiveChips([
      {
        key: 'emotionalExpression',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.emotionalExpression);
  });

  it('pickPositiveChips includes Feels heard from synthetic both-high listening entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'listeningFeelsHeard',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.listeningFeelsHeard);
  });
});
