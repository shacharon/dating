import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from './extraction-strict-validation';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  SHADOW_SIGNAL_KEYS,
} from './extracted-signals.interface';
import {
  EXPANSION_10_PROMOTION_CHIP_LABELS,
  EXPANSION_10_PROMOTION_DOMAINS,
  EXPANSION_10_PROMOTION_TIERS,
  EXPANSION_10_PROMOTION_WEIGHTS,
  EXPANSION_10_SHADOW_SIGNAL_KEYS,
} from './expansion-10-signal-definitions';
import { SHADOW_POSITIVE_CHIP_BY_SIGNAL } from '../matches/expansion-10-explainability';
import { tensionRules } from '../engine/tension-rules';

describe('Expansion-10 rollout gate', () => {
  const expansion10Keys = ['repairSkills', 'forgivenessStyle'] as const;

  it('keeps shadow membership and extraction counts', () => {
    for (const k of expansion10Keys) {
      expect(SHADOW_SIGNAL_KEYS).toContain(k);
    }
    expect(SHADOW_SIGNAL_KEYS.length).toBe(38);
    expect(EXTRACTION_SIGNAL_KEYS.length).toBe(53);
    expect(MAX_EVIDENCE_ITEMS).toBe(57);
    expect(EXPANSION_10_SHADOW_SIGNAL_KEYS).toEqual([...expansion10Keys]);
  });

  it('keeps Expansion-10 keys out of scored compatibility set', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
    for (const k of expansion10Keys) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it('requires DOMAIN_ALLOWED membership on self + partner', () => {
    for (const k of expansion10Keys) {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
    }
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(45);
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(31);
  });

  it('exposes promotion-ready metadata matching Story 1', () => {
    expect(EXPANSION_10_PROMOTION_WEIGHTS.repairSkills).toBe(1.4);
    expect(EXPANSION_10_PROMOTION_WEIGHTS.forgivenessStyle).toBe(1.3);
    expect(EXPANSION_10_PROMOTION_TIERS.repairSkills).toBe(2);
    expect(EXPANSION_10_PROMOTION_TIERS.forgivenessStyle).toBe(2);
    expect(EXPANSION_10_PROMOTION_DOMAINS.repairSkills).toBe('communication');
    expect(EXPANSION_10_PROMOTION_DOMAINS.forgivenessStyle).toBe('communication');
    expect(EXPANSION_10_PROMOTION_CHIP_LABELS.repairSkills).toBe(
      'Conflict recovery',
    );
    expect(EXPANSION_10_PROMOTION_CHIP_LABELS.forgivenessStyle).toBe(
      'Letting go & moving forward',
    );
  });

  it('exposes shadow positive chip labels', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.repairSkills).toBe(
      'Conflict recovery',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.forgivenessStyle).toBe(
      'Letting go & moving forward',
    );
  });

  it('registers Expansion-10 tension rule ids', () => {
    const ids = new Set(tensionRules.map((r) => r.id));
    expect(ids.has('repair_skills_gap')).toBe(true);
    expect(ids.has('both_low_repair')).toBe(true);
    expect(ids.has('forgiveness_style_gap')).toBe(true);
  });
});
