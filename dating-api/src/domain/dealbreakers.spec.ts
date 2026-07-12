import {
  applyDealbreakerCap,
  computeDealbreakers,
} from './dealbreakers';
import { RELATIONSHIP_CLARITY_MISMATCH_CODE } from './kids-family-ownership';
import type { DerivedContext } from './deriveContext';

function ctx(overrides: Partial<DerivedContext> = {}): DerivedContext {
  return { visibilityNeed: 5, lifeStage: 5, ...overrides };
}

describe('computeDealbreakers', () => {
  it('does not trigger EMOTIONAL_DEPTH_FLOOR when both emotionalDepth <= 3', () => {
    const result = computeDealbreakers({
      a: {
        signals: { emotionalDepth: 2 },
        ctx: ctx(),
      },
      b: {
        signals: { emotionalDepth: 3 },
        ctx: ctx(),
      },
    });

    expect(result.some((d) => d.code === 'EMOTIONAL_DEPTH_FLOOR')).toBe(false);
  });

  it('EMOTIONAL_DEPTH_FLOOR PENALTY when one depth >= 8 and other <= 2', () => {
    const result = computeDealbreakers({
      a: { signals: { emotionalDepth: 9 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 2 }, ctx: ctx() },
    });

    const db = result.find((d) => d.code === 'EMOTIONAL_DEPTH_FLOOR');
    expect(db).toBeDefined();
    expect(db!.severity).toBe('PENALTY');
    expect(db!.evidence.some((e) => e.includes('mismatch'))).toBe(true);
  });

  it('EMOTIONAL_DEPTH_FLOOR at boundary 8 vs 2', () => {
    const result = computeDealbreakers({
      a: { signals: { emotionalDepth: 8 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 2 }, ctx: ctx() },
    });

    expect(result.some((d) => d.code === 'EMOTIONAL_DEPTH_FLOOR')).toBe(true);
  });

  it('does not trigger EMOTIONAL_DEPTH_FLOOR at 8 vs 3', () => {
    const result = computeDealbreakers({
      a: { signals: { emotionalDepth: 8 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 3 }, ctx: ctx() },
    });

    expect(result.some((d) => d.code === 'EMOTIONAL_DEPTH_FLOOR')).toBe(false);
  });

  it('does not trigger EMOTIONAL_DEPTH_FLOOR at 7 vs 2 (high threshold is 8)', () => {
    const result = computeDealbreakers({
      a: { signals: { emotionalDepth: 7 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 2 }, ctx: ctx() },
    });

    expect(result.some((d) => d.code === 'EMOTIONAL_DEPTH_FLOOR')).toBe(false);
  });

  it('does not trigger EMOTIONAL_DEPTH_FLOOR when only one has low emotionalDepth', () => {
    const result = computeDealbreakers({
      a: { signals: { emotionalDepth: 2 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 7 }, ctx: ctx() },
    });

    expect(result.some((d) => d.code === 'EMOTIONAL_DEPTH_FLOOR')).toBe(false);
  });

  it('VISIBILITY_NEED_MISMATCH triggers when visibilityNeed gap >= 6', () => {
    const result = computeDealbreakers({
      a: { signals: {}, ctx: ctx({ visibilityNeed: 2 }) },
      b: { signals: {}, ctx: ctx({ visibilityNeed: 8 }) },
    });

    const db = result.find((d) => d.code === 'VISIBILITY_NEED_MISMATCH');
    expect(db).toBeDefined();
    expect(db!.severity).toBe('STRONG_FLAG');
    expect(db!.evidence.some((e) => e.includes('visibilityNeed'))).toBe(true);
  });

  it('does not trigger VISIBILITY_NEED_MISMATCH when gap < 6', () => {
    const result = computeDealbreakers({
      a: { signals: {}, ctx: ctx({ visibilityNeed: 4 }) },
      b: { signals: {}, ctx: ctx({ visibilityNeed: 8 }) },
    });

    expect(result.some((d) => d.code === 'VISIBILITY_NEED_MISMATCH')).toBe(false);
  });

  it('RELATIONSHIP_CLARITY_MISMATCH HARD when relationshipClarity is extreme 9 vs 2', () => {
    const result = computeDealbreakers({
      a: { signals: { relationshipClarity: 9 }, ctx: ctx() },
      b: { signals: { relationshipClarity: 2 }, ctx: ctx() },
    });
    const db = result.find((d) => d.code === RELATIONSHIP_CLARITY_MISMATCH_CODE);
    expect(db).toBeDefined();
    expect(db!.severity).toBe('HARD');
  });
});

describe('applyDealbreakerCap', () => {
  it('scores higher for bilateral low depth than under old bilateral STRONG_FLAG rule', () => {
    const bilateralLow = computeDealbreakers({
      a: { signals: { emotionalDepth: 2 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 2 }, ctx: ctx() },
    });
    const directionalMismatch = computeDealbreakers({
      a: { signals: { emotionalDepth: 9 }, ctx: ctx() },
      b: { signals: { emotionalDepth: 2 }, ctx: ctx() },
    });

    const scoreBilateralLow = applyDealbreakerCap(70, bilateralLow);
    const scoreDirectional = applyDealbreakerCap(70, directionalMismatch);

    expect(scoreBilateralLow).toBe(70);
    expect(scoreDirectional).toBe(55);
  });
});
