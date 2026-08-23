import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from './extraction-strict-validation';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  SHADOW_SIGNAL_KEYS,
} from './extracted-signals.interface';
import {
  EXPANSION_15_PROMOTION_CHIP_LABELS,
  EXPANSION_15_PROMOTION_DOMAINS,
  EXPANSION_15_PROMOTION_TIERS,
  EXPANSION_15_PROMOTION_WEIGHTS,
  EXPANSION_15_SHADOW_SIGNAL_KEYS,
} from './expansion-15-signal-definitions';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
  SHADOW_SIGNAL_DOMAIN,
} from '../matches/explainability/expansions/10-15/expansion-15-explainability';
import { tensionRules } from '../engine/tension-rules';

describe('Expansion-15 rollout gate', () => {
  const expansion15Keys = [
    'familyEnmeshment',
    'friendCoupleBalance',
    'aloneTimeNeed',
  ] as const;

  it('keeps shadow membership and extraction counts', () => {
    for (const k of expansion15Keys) {
      expect(SHADOW_SIGNAL_KEYS).toContain(k);
    }
    expect(SHADOW_SIGNAL_KEYS.length).toBe(38);
    expect(EXTRACTION_SIGNAL_KEYS.length).toBe(53);
    expect(MAX_EVIDENCE_ITEMS).toBe(57);
    expect(EXPANSION_15_SHADOW_SIGNAL_KEYS).toEqual([...expansion15Keys]);
  });

  it('keeps Expansion-15 keys out of scored compatibility set', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
    for (const k of expansion15Keys) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it('requires DOMAIN_ALLOWED membership on self + partner', () => {
    for (const k of expansion15Keys) {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
    }
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(45);
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(31);
  });

  it('exposes promotion-ready metadata matching Story 1', () => {
    expect(EXPANSION_15_PROMOTION_WEIGHTS.familyEnmeshment).toBe(1.2);
    expect(EXPANSION_15_PROMOTION_WEIGHTS.friendCoupleBalance).toBe(1.1);
    expect(EXPANSION_15_PROMOTION_WEIGHTS.aloneTimeNeed).toBe(1.2);
    expect(EXPANSION_15_PROMOTION_TIERS.familyEnmeshment).toBe(2);
    expect(EXPANSION_15_PROMOTION_TIERS.friendCoupleBalance).toBe(3);
    expect(EXPANSION_15_PROMOTION_TIERS.aloneTimeNeed).toBe(2);
    expect(EXPANSION_15_PROMOTION_DOMAINS.familyEnmeshment).toBe('relationship');
    expect(EXPANSION_15_PROMOTION_DOMAINS.friendCoupleBalance).toBe('social');
    expect(EXPANSION_15_PROMOTION_DOMAINS.aloneTimeNeed).toBe('social');
    expect(EXPANSION_15_PROMOTION_CHIP_LABELS.familyEnmeshment).toBe(
      'Family closeness',
    );
    expect(EXPANSION_15_PROMOTION_CHIP_LABELS.friendCoupleBalance).toBe(
      'Friends & couple balance',
    );
    expect(EXPANSION_15_PROMOTION_CHIP_LABELS.aloneTimeNeed).toBe(
      'Alone time needs',
    );
  });

  it('exposes shadow positive chip labels and domains', () => {
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

  it('registers Expansion-15 tension rule ids', () => {
    const ids = new Set(tensionRules.map((r) => r.id));
    expect(ids.has('family_enmeshment_gap')).toBe(true);
    expect(ids.has('friend_couple_balance_gap')).toBe(true);
    expect(ids.has('alone_time_need_gap')).toBe(true);
  });
});
