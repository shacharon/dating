import {
  analyzeExplainabilityRow,
  BOILERPLATE_REASON_MARKERS,
  pairLabelFromRecord,
} from './explainability-review-heuristics';

describe('analyzeExplainabilityRow', () => {
  it('flags missing explainability', () => {
    const r = analyzeExplainabilityRow({
      matchId: 'a__b',
      pairLabel: 'A / B',
      finalScore: 70,
      explainability: undefined,
    });
    expect(r.flags).toContain('missing_explainability');
    expect(r.suspiciousScore).toBeGreaterThan(0);
  });

  it('flags boilerplate when no positive chips', () => {
    const r = analyzeExplainabilityRow({
      matchId: 'a__b',
      pairLabel: 'A / B',
      finalScore: 60,
      friction: 1,
      explainability: {
        positiveChips: [],
        reasonShort: `Solid compatibility with ${BOILERPLATE_REASON_MARKERS[0]}.`,
      },
    });
    expect(r.flags).toContain('boilerplate_no_chip_copy');
  });

  it('does not flag boilerplate when chips present', () => {
    const r = analyzeExplainabilityRow({
      matchId: 'a__b',
      pairLabel: 'A / B',
      finalScore: 60,
      explainability: {
        positiveChips: ['Shared values'],
        reasonShort: 'Solid overlap on Shared values.',
      },
    });
    expect(r.flags).not.toContain('boilerplate_no_chip_copy');
  });

  it('flags duplicate positive chips', () => {
    const r = analyzeExplainabilityRow({
      matchId: 'a__b',
      pairLabel: 'A / B',
      finalScore: 55,
      explainability: {
        positiveChips: ['Shared values', 'Shared values'],
        reasonShort: 'Solid overlap on Shared values and Shared values.',
      },
    });
    expect(r.flags).toContain('duplicate_positive_chip');
  });

  it('flags high friction without tension chip', () => {
    const r = analyzeExplainabilityRow({
      matchId: 'a__b',
      pairLabel: 'A / B',
      finalScore: 50,
      friction: 4,
      explainability: {
        positiveChips: ['Direct communication'],
        reasonShort: 'Solid overlap on Direct communication.',
      },
    });
    expect(r.flags).toContain('high_friction_no_tension_chip');
  });

  it('pairLabelFromRecord joins names', () => {
    expect(pairLabelFromRecord('X', 'Y')).toBe('X / Y');
  });
});
