import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from './extraction-strict-validation';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  SHADOW_SIGNAL_KEYS,
} from './extracted-signals.interface';
import {
  EXPANSION_13_PROMOTION_CHIP_LABELS,
  EXPANSION_13_PROMOTION_DOMAINS,
  EXPANSION_13_PROMOTION_TIERS,
  EXPANSION_13_PROMOTION_WEIGHTS,
  EXPANSION_13_SHADOW_SIGNAL_KEYS,
} from './expansion-13-signal-definitions';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
  SHADOW_SIGNAL_DOMAIN,
} from '../matches/explainability/expansions/10-15/expansion-13-explainability';
import { tensionRules } from '../engine/tension-rules';

describe('Expansion-13 rollout gate', () => {
  const expansion13Keys = ['growthMindset', 'selfAwareness'] as const;

  it('keeps shadow membership and extraction counts', () => {
    for (const k of expansion13Keys) {
      expect(SHADOW_SIGNAL_KEYS).toContain(k);
    }
    expect(SHADOW_SIGNAL_KEYS.length).toBe(38);
    expect(EXTRACTION_SIGNAL_KEYS.length).toBe(53);
    expect(MAX_EVIDENCE_ITEMS).toBe(57);
    expect(EXPANSION_13_SHADOW_SIGNAL_KEYS).toEqual([...expansion13Keys]);
  });

  it('keeps Expansion-13 keys out of scored compatibility set', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
    for (const k of expansion13Keys) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it('requires DOMAIN_ALLOWED membership on self + partner', () => {
    for (const k of expansion13Keys) {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
    }
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(45);
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(31);
  });

  it('exposes promotion-ready metadata matching Story 1', () => {
    expect(EXPANSION_13_PROMOTION_WEIGHTS.growthMindset).toBe(1.3);
    expect(EXPANSION_13_PROMOTION_WEIGHTS.selfAwareness).toBe(1.2);
    expect(EXPANSION_13_PROMOTION_TIERS.growthMindset).toBe(2);
    expect(EXPANSION_13_PROMOTION_TIERS.selfAwareness).toBe(2);
    expect(EXPANSION_13_PROMOTION_DOMAINS.growthMindset).toBe('personal');
    expect(EXPANSION_13_PROMOTION_DOMAINS.selfAwareness).toBe('personal');
    expect(EXPANSION_13_PROMOTION_CHIP_LABELS.growthMindset).toBe(
      'Openness to growth',
    );
    expect(EXPANSION_13_PROMOTION_CHIP_LABELS.selfAwareness).toBe(
      'Self-awareness',
    );
  });

  it('exposes shadow positive chip labels and personal domains', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.growthGrowsTogether).toBe(
      'Grows together',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.selfAwarenessMatch).toBe(
      'Self-awareness match',
    );
    expect(SHADOW_SIGNAL_DOMAIN.growthGrowsTogether).toBe('personal');
    expect(SHADOW_SIGNAL_DOMAIN.selfAwarenessMatch).toBe('personal');
  });

  it('registers Expansion-13 tension rule ids', () => {
    const ids = new Set(tensionRules.map((r) => r.id));
    expect(ids.has('growth_mindset_gap')).toBe(true);
    expect(ids.has('both_low_self_awareness')).toBe(true);
  });
});
