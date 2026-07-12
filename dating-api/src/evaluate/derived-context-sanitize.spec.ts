import { mapOccupationForDealbreakers } from '../domain/deriveContext';
import { sanitizeDerivedContextForPersist } from './derived-context-sanitize';

describe('sanitizeDerivedContextForPersist', () => {
  it('preserves valid full payload with version v1', () => {
    const out = sanitizeDerivedContextForPersist({
      occupationClass: 'SHIFT_UNPREDICTABLE',
      visibilityNeed: 3,
      lifeStage: 7,
      confidence: 0.85,
      evidence: ['night shift nurse', 'settled home life'],
    });
    expect(out).toEqual({
      version: 'v1',
      occupationClass: 'SHIFT_UNPREDICTABLE',
      visibilityNeed: 3,
      lifeStage: 7,
      confidence: 0.85,
      evidence: ['night shift nurse', 'settled home life'],
    });
  });

  it('clamps visibilityNeed above 10', () => {
    const out = sanitizeDerivedContextForPersist({
      visibilityNeed: 12,
      lifeStage: 4,
    });
    expect(out.visibilityNeed).toBe(10);
    expect(out.lifeStage).toBe(4);
  });

  it('maps invalid occupationClass to null', () => {
    const out = sanitizeDerivedContextForPersist({
      occupationClass: 'NURSE',
      visibilityNeed: 5,
      lifeStage: 5,
    });
    expect(out.occupationClass).toBeNull();
  });

  it('defaults missing numerics to 5', () => {
    const out = sanitizeDerivedContextForPersist({});
    expect(out.visibilityNeed).toBe(5);
    expect(out.lifeStage).toBe(5);
    expect(out.occupationClass).toBeNull();
    expect(out.version).toBe('v1');
  });

  it('stores STANDARD; mapOccupationForDealbreakers returns undefined', () => {
    const out = sanitizeDerivedContextForPersist({
      occupationClass: 'STANDARD',
      visibilityNeed: 5,
      lifeStage: 5,
    });
    expect(out.occupationClass).toBe('STANDARD');
    expect(mapOccupationForDealbreakers(out.occupationClass)).toBeUndefined();
  });
});
