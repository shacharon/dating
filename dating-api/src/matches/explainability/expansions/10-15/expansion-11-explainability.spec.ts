import {
  buildExpansion11ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
} from './expansion-11-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion11ShadowBreakdown', () => {
  it('builds entry with pairScore >= 7 when both sides are high on stressResponse', () => {
    const breakdown = buildExpansion11ShadowBreakdown(
      { stressResponse: 8 },
      { stressResponse: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('stressResponse');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('builds entry when both sides are low-aligned on stressResponse', () => {
    const breakdown = buildExpansion11ShadowBreakdown(
      { stressResponse: 2 },
      { stressResponse: 2 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('stressResponse');
    expect(breakdown[0].pairScore).toBeGreaterThanOrEqual(7);
  });

  it('skips stressResponse when either side is null', () => {
    expect(
      buildExpansion11ShadowBreakdown(
        { stressResponse: 8 },
        { stressResponse: null },
      ),
    ).toEqual([]);
  });

  it('skips non-finite stressResponse values', () => {
    expect(
      buildExpansion11ShadowBreakdown(
        { stressResponse: Number.NaN },
        { stressResponse: 8 },
      ),
    ).toEqual([]);
  });

  it('emits synthetic jealousySecureTrusting when both jealousySecurity <= 3', () => {
    const breakdown = buildExpansion11ShadowBreakdown(
      { jealousySecurity: 2 },
      { jealousySecurity: 3 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('jealousySecureTrusting');
    expect(breakdown[0].pairScore).toBe(10);
  });

  it('does not emit synthetic chip when both jealousySecurity are high', () => {
    expect(
      buildExpansion11ShadowBreakdown(
        { jealousySecurity: 8 },
        { jealousySecurity: 9 },
      ),
    ).toEqual([]);
  });

  it('does not emit synthetic chip on jealousy gap', () => {
    expect(
      buildExpansion11ShadowBreakdown(
        { jealousySecurity: 9 },
        { jealousySecurity: 2 },
      ),
    ).toEqual([]);
  });

  it('exposes exact chip map labels', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.stressResponse).toBe(
      'Support under pressure',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.jealousySecureTrusting).toBe(
      'Secure & trusting',
    );
  });
});

describe('Expansion-11 shadow positive chips', () => {
  it('pickPositiveChips includes Support under pressure from high stressResponse', () => {
    const chips = pickPositiveChips([
      {
        key: 'stressResponse',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.stressResponse);
  });

  it('pickPositiveChips includes Secure & trusting from synthetic both-low entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'jealousySecureTrusting',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(
      SHADOW_POSITIVE_CHIP_BY_SIGNAL.jealousySecureTrusting,
    );
  });
});
