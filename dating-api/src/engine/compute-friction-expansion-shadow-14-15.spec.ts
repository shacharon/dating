import { computeFriction } from './compute-friction';
import type { EnrichedSignals } from './tension-rules';

describe('compute-friction expansion shadow (14-15)', () => {
  describe('Expansion-14 shadow tension rules', () => {
    it('patience_tolerance_gap fires when tolerance levels diverge', () => {
      const a: EnrichedSignals = { patienceTolerance: 9 };
      const b: EnrichedSignals = { patienceTolerance: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'patience_tolerance_gap',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(3);
    });

    it('patience_tolerance_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { patienceTolerance: 2 };
      const b: EnrichedSignals = { patienceTolerance: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'patience_tolerance_gap'),
      ).toBe(true);
    });

    it('patience_tolerance_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { patienceTolerance: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'patience_tolerance_gap'),
      ).toBe(false);
    });

    it('patience_tolerance_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { patienceTolerance: 7 };
      const b: EnrichedSignals = { patienceTolerance: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'patience_tolerance_gap'),
      ).toBe(false);
    });

    it('patience_tolerance_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { patienceTolerance: 8 };
      const b: EnrichedSignals = { patienceTolerance: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'patience_tolerance_gap'),
      ).toBe(true);
    });

    it('intimacy_pacing_clash fires when pacing levels diverge', () => {
      const a: EnrichedSignals = { intimacyPacing: 9 };
      const b: EnrichedSignals = { intimacyPacing: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'intimacy_pacing_clash');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('intimacy_pacing_clash fires when high/low is reversed', () => {
      const a: EnrichedSignals = { intimacyPacing: 2 };
      const b: EnrichedSignals = { intimacyPacing: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'intimacy_pacing_clash'),
      ).toBe(true);
    });

    it('intimacy_pacing_clash does not fire when either side is null', () => {
      const a: EnrichedSignals = { intimacyPacing: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'intimacy_pacing_clash'),
      ).toBe(false);
    });

    it('intimacy_pacing_clash does not fire below directional threshold', () => {
      const a: EnrichedSignals = { intimacyPacing: 7 };
      const b: EnrichedSignals = { intimacyPacing: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'intimacy_pacing_clash'),
      ).toBe(false);
    });

    it('intimacy_pacing_clash fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { intimacyPacing: 8 };
      const b: EnrichedSignals = { intimacyPacing: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'intimacy_pacing_clash'),
      ).toBe(true);
    });

    it('monogamy_alignment_mismatch fires for mono vs open (low=mono polarity)', () => {
      const a: EnrichedSignals = { monogamyAlignment: 2 };
      const b: EnrichedSignals = { monogamyAlignment: 9 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'monogamy_alignment_mismatch',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(8);
    });

    it('monogamy_alignment_mismatch fires when open/mono is reversed', () => {
      const a: EnrichedSignals = { monogamyAlignment: 9 };
      const b: EnrichedSignals = { monogamyAlignment: 2 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(true);
    });

    it('monogamy_alignment_mismatch does not fire when either side is null', () => {
      const a: EnrichedSignals = { monogamyAlignment: 2 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(false);
    });

    it('monogamy_alignment_mismatch does not fire below high band (>= 8)', () => {
      const a: EnrichedSignals = { monogamyAlignment: 2 };
      const b: EnrichedSignals = { monogamyAlignment: 7 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(false);
    });

    it('monogamy_alignment_mismatch fires at high-band boundary (>= 8)', () => {
      const a: EnrichedSignals = { monogamyAlignment: 2 };
      const b: EnrichedSignals = { monogamyAlignment: 8 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(true);
    });

    it('monogamy_alignment_mismatch does not fire for soft-low (3) vs open', () => {
      const a: EnrichedSignals = { monogamyAlignment: 3 };
      const b: EnrichedSignals = { monogamyAlignment: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(false);
    });

    it('monogamy_alignment_mismatch does not fire when both are mono-aligned', () => {
      const a: EnrichedSignals = { monogamyAlignment: 2 };
      const b: EnrichedSignals = { monogamyAlignment: 1 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(false);
    });

    it('monogamy_alignment_mismatch does not fire when both are open-aligned', () => {
      const a: EnrichedSignals = { monogamyAlignment: 9 };
      const b: EnrichedSignals = { monogamyAlignment: 8 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'monogamy_alignment_mismatch'),
      ).toBe(false);
    });
  });

  describe('Expansion-15 shadow tension rules', () => {
    it('family_enmeshment_gap fires when family involvement diverges', () => {
      const a: EnrichedSignals = { familyEnmeshment: 9 };
      const b: EnrichedSignals = { familyEnmeshment: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'family_enmeshment_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(4);
    });

    it('family_enmeshment_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { familyEnmeshment: 2 };
      const b: EnrichedSignals = { familyEnmeshment: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'family_enmeshment_gap'),
      ).toBe(true);
    });

    it('family_enmeshment_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { familyEnmeshment: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'family_enmeshment_gap'),
      ).toBe(false);
    });

    it('family_enmeshment_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { familyEnmeshment: 7 };
      const b: EnrichedSignals = { familyEnmeshment: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'family_enmeshment_gap'),
      ).toBe(false);
    });

    it('family_enmeshment_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { familyEnmeshment: 8 };
      const b: EnrichedSignals = { familyEnmeshment: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'family_enmeshment_gap'),
      ).toBe(true);
    });

    it('friend_couple_balance_gap fires when friends vs couple priority diverges', () => {
      const a: EnrichedSignals = { friendCoupleBalance: 9 };
      const b: EnrichedSignals = { friendCoupleBalance: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find(
        (t) => t.id === 'friend_couple_balance_gap',
      );
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(3);
    });

    it('friend_couple_balance_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { friendCoupleBalance: 2 };
      const b: EnrichedSignals = { friendCoupleBalance: 9 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'friend_couple_balance_gap'),
      ).toBe(true);
    });

    it('friend_couple_balance_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { friendCoupleBalance: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'friend_couple_balance_gap'),
      ).toBe(false);
    });

    it('friend_couple_balance_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { friendCoupleBalance: 7 };
      const b: EnrichedSignals = { friendCoupleBalance: 4 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'friend_couple_balance_gap'),
      ).toBe(false);
    });

    it('friend_couple_balance_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { friendCoupleBalance: 8 };
      const b: EnrichedSignals = { friendCoupleBalance: 3 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'friend_couple_balance_gap'),
      ).toBe(true);
    });

    it('alone_time_need_gap fires when alone-time needs diverge', () => {
      const a: EnrichedSignals = { aloneTimeNeed: 9 };
      const b: EnrichedSignals = { aloneTimeNeed: 2 };
      const result = computeFriction(a, b);
      const rule = result.tensions.find((t) => t.id === 'alone_time_need_gap');
      expect(rule).toBeDefined();
      expect(rule!.penalty).toBe(3);
    });

    it('alone_time_need_gap fires when high/low is reversed', () => {
      const a: EnrichedSignals = { aloneTimeNeed: 2 };
      const b: EnrichedSignals = { aloneTimeNeed: 9 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'alone_time_need_gap')).toBe(
        true,
      );
    });

    it('alone_time_need_gap does not fire when either side is null', () => {
      const a: EnrichedSignals = { aloneTimeNeed: 9 };
      const b: EnrichedSignals = {};
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'alone_time_need_gap')).toBe(
        false,
      );
    });

    it('alone_time_need_gap does not fire below directional threshold', () => {
      const a: EnrichedSignals = { aloneTimeNeed: 7 };
      const b: EnrichedSignals = { aloneTimeNeed: 4 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'alone_time_need_gap')).toBe(
        false,
      );
    });

    it('alone_time_need_gap fires at low-band boundary (<= 3)', () => {
      const a: EnrichedSignals = { aloneTimeNeed: 8 };
      const b: EnrichedSignals = { aloneTimeNeed: 3 };
      const result = computeFriction(a, b);
      expect(result.tensions.some((t) => t.id === 'alone_time_need_gap')).toBe(
        true,
      );
    });

    it('family_enmeshment_gap does not fire when both are high-aligned', () => {
      const a: EnrichedSignals = { familyEnmeshment: 9 };
      const b: EnrichedSignals = { familyEnmeshment: 8 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'family_enmeshment_gap'),
      ).toBe(false);
    });

    it('friend_couple_balance_gap does not fire when both are friends-first aligned', () => {
      const a: EnrichedSignals = { friendCoupleBalance: 2 };
      const b: EnrichedSignals = { friendCoupleBalance: 1 };
      const result = computeFriction(a, b);
      expect(
        result.tensions.some((t) => t.id === 'friend_couple_balance_gap'),
      ).toBe(false);
    });
  });
});
