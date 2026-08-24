import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from '../pipeline/extraction-strict-validation';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  SHADOW_SIGNAL_KEYS,
} from '../extracted-signals.interface';
import {
  EXPANSION_11_PROMOTION_CHIP_LABELS,
  EXPANSION_11_PROMOTION_DOMAINS,
  EXPANSION_11_PROMOTION_TIERS,
  EXPANSION_11_PROMOTION_WEIGHTS,
  EXPANSION_11_SHADOW_SIGNAL_KEYS,
} from './expansion-11-signal-definitions';
import { SHADOW_POSITIVE_CHIP_BY_SIGNAL } from '../../matches/explainability/expansions/10-15/expansion-11-explainability';
import { tensionRules } from '../../engine/tension-rules';

describe('Expansion-11 rollout gate', () => {
  const expansion11Keys = ['stressResponse', 'jealousySecurity'] as const;

  it('keeps shadow membership and extraction counts', () => {
    for (const k of expansion11Keys) {
      expect(SHADOW_SIGNAL_KEYS).toContain(k);
    }
    expect(SHADOW_SIGNAL_KEYS.length).toBe(38);
    expect(EXTRACTION_SIGNAL_KEYS.length).toBe(53);
    expect(MAX_EVIDENCE_ITEMS).toBe(57);
    expect(EXPANSION_11_SHADOW_SIGNAL_KEYS).toEqual([...expansion11Keys]);
  });

  it('keeps Expansion-11 keys out of scored compatibility set', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
    for (const k of expansion11Keys) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it('requires DOMAIN_ALLOWED membership on self + partner', () => {
    for (const k of expansion11Keys) {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
    }
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(45);
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(31);
  });

  it('exposes promotion-ready metadata matching Story 1', () => {
    expect(EXPANSION_11_PROMOTION_WEIGHTS.stressResponse).toBe(1.3);
    expect(EXPANSION_11_PROMOTION_WEIGHTS.jealousySecurity).toBe(1.4);
    expect(EXPANSION_11_PROMOTION_TIERS.stressResponse).toBe(2);
    expect(EXPANSION_11_PROMOTION_TIERS.jealousySecurity).toBe(1);
    expect(EXPANSION_11_PROMOTION_DOMAINS.stressResponse).toBe('emotional');
    expect(EXPANSION_11_PROMOTION_DOMAINS.jealousySecurity).toBe('emotional');
    expect(EXPANSION_11_PROMOTION_CHIP_LABELS.stressResponse).toBe(
      'Support under pressure',
    );
    expect(EXPANSION_11_PROMOTION_CHIP_LABELS.jealousySecurity).toBe(
      'Trust & security',
    );
  });

  it('exposes shadow positive chip labels', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.stressResponse).toBe(
      'Support under pressure',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.jealousySecureTrusting).toBe(
      'Secure & trusting',
    );
  });

  it('registers Expansion-11 tension rule ids', () => {
    const ids = new Set(tensionRules.map((r) => r.id));
    expect(ids.has('stress_response_clash')).toBe(true);
    expect(ids.has('jealousy_security_gap')).toBe(true);
    expect(ids.has('both_high_jealousy')).toBe(true);
  });
});
