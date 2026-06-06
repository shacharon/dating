import { resolveEngineFinalScore } from './match-score.util';

describe('resolveEngineFinalScore', () => {
  it('returns finalScore when present', () => {
    expect(resolveEngineFinalScore({ finalScore: 72 })).toBe(72);
  });

  it('falls back to legacy overall', () => {
    expect(resolveEngineFinalScore({ overall: 65 })).toBe(65);
  });

  it('prefers finalScore over legacy overall', () => {
    expect(resolveEngineFinalScore({ finalScore: 80, overall: 10 })).toBe(80);
  });

  it('returns 0 when missing or invalid', () => {
    expect(resolveEngineFinalScore({})).toBe(0);
    expect(resolveEngineFinalScore({ finalScore: NaN })).toBe(0);
  });
});
