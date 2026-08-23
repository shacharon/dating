import {
  buildExpansion15ShadowBreakdown,
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
  SHADOW_SIGNAL_DOMAIN,
} from './expansion-15-explainability';
import { pickPositiveChips } from '../../core/match-explainability';

describe('buildExpansion15ShadowBreakdown', () => {
  it('emits synthetic familyStyleMatch when both familyEnmeshment >= 7', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { familyEnmeshment: 8 },
      { familyEnmeshment: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('familyStyleMatch');
    expect(breakdown[0].pairScore).toBe(10);
  });

  it('emits synthetic familyStyleMatch when both familyEnmeshment <= 3', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { familyEnmeshment: 2 },
      { familyEnmeshment: 3 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('familyStyleMatch');
  });

  it('emits synthetic familyStyleMatch at high-band boundary (both >= 7)', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { familyEnmeshment: 7 },
      { familyEnmeshment: 7 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('familyStyleMatch');
  });

  it('does not emit family chip on family enmeshment gap', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { familyEnmeshment: 9 },
        { familyEnmeshment: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit family chip for mid/mid (not dual-band)', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { familyEnmeshment: 5 },
        { familyEnmeshment: 5 },
      ),
    ).toEqual([]);
  });

  it('does not emit family chip when one side is below high band', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { familyEnmeshment: 6 },
        { familyEnmeshment: 7 },
      ),
    ).toEqual([]);
  });

  it('does not emit family chip when either side is null', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { familyEnmeshment: 8 },
        { familyEnmeshment: null },
      ),
    ).toEqual([]);
  });

  it('emits friendCoupleAligned when both friendCoupleBalance >= 7', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { friendCoupleBalance: 8 },
      { friendCoupleBalance: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('friendCoupleAligned');
  });

  it('emits friendCoupleAligned when both friendCoupleBalance <= 3', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { friendCoupleBalance: 2 },
      { friendCoupleBalance: 1 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('friendCoupleAligned');
  });

  it('does not emit friend/couple chip on balance gap', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { friendCoupleBalance: 9 },
        { friendCoupleBalance: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit friend/couple chip when either side is null', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { friendCoupleBalance: 8 },
        { friendCoupleBalance: null },
      ),
    ).toEqual([]);
  });

  it('emits rechargeStyleMatch when both aloneTimeNeed >= 7', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { aloneTimeNeed: 8 },
      { aloneTimeNeed: 9 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('rechargeStyleMatch');
  });

  it('emits rechargeStyleMatch when both aloneTimeNeed <= 3', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      { aloneTimeNeed: 2 },
      { aloneTimeNeed: 3 },
    );
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].key).toBe('rechargeStyleMatch');
  });

  it('does not emit recharge chip on alone-time gap', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { aloneTimeNeed: 9 },
        { aloneTimeNeed: 2 },
      ),
    ).toEqual([]);
  });

  it('does not emit recharge chip when either side is null', () => {
    expect(
      buildExpansion15ShadowBreakdown(
        { aloneTimeNeed: 8 },
        { aloneTimeNeed: null },
      ),
    ).toEqual([]);
  });

  it('emits all three synthetics when all dual-band high', () => {
    const breakdown = buildExpansion15ShadowBreakdown(
      {
        familyEnmeshment: 8,
        friendCoupleBalance: 8,
        aloneTimeNeed: 8,
      },
      {
        familyEnmeshment: 9,
        friendCoupleBalance: 9,
        aloneTimeNeed: 9,
      },
    );
    expect(breakdown.map((e) => e.key)).toEqual([
      'familyStyleMatch',
      'friendCoupleAligned',
      'rechargeStyleMatch',
    ]);
  });

  it('exposes exact browse chip labels and domains', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.familyStyleMatch).toBe(
      'Family style match',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.friendCoupleAligned).toBe(
      'Friends & couple balance',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.rechargeStyleMatch).toBe(
      'Recharge style match',
    );
    expect(SHADOW_SIGNAL_DOMAIN.familyStyleMatch).toBe('relationship');
    expect(SHADOW_SIGNAL_DOMAIN.friendCoupleAligned).toBe('social');
    expect(SHADOW_SIGNAL_DOMAIN.rechargeStyleMatch).toBe('social');
  });
});

describe('Expansion-15 shadow positive chips', () => {
  it('pickPositiveChips includes Family style match from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'familyStyleMatch',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.familyStyleMatch);
  });

  it('pickPositiveChips includes Friends & couple balance from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'friendCoupleAligned',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.friendCoupleAligned);
  });

  it('pickPositiveChips includes Recharge style match from synthetic entry', () => {
    const chips = pickPositiveChips([
      {
        key: 'rechargeStyleMatch',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ]);
    expect(chips).toContain(SHADOW_POSITIVE_CHIP_BY_SIGNAL.rechargeStyleMatch);
  });
});
