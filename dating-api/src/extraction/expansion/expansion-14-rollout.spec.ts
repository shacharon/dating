import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from '../pipeline/extraction-strict-validation';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  SHADOW_SIGNAL_KEYS,
} from '../extracted-signals.interface';
import {
  EXPANSION_14_PROMOTION_CHIP_LABELS,
  EXPANSION_14_PROMOTION_DOMAINS,
  EXPANSION_14_PROMOTION_TIERS,
  EXPANSION_14_PROMOTION_WEIGHTS,
  EXPANSION_14_SHADOW_SIGNAL_KEYS,
} from './expansion-14-signal-definitions';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL,
  SHADOW_SIGNAL_DOMAIN,
} from '../../matches/explainability/expansions/10-15/expansion-14-explainability';
import { tensionRules } from '../../engine/tension-rules';

describe('Expansion-14 rollout gate', () => {
  const expansion14Keys = [
    'patienceTolerance',
    'intimacyPacing',
    'monogamyAlignment',
  ] as const;

  it('keeps shadow membership and extraction counts', () => {
    for (const k of expansion14Keys) {
      expect(SHADOW_SIGNAL_KEYS).toContain(k);
    }
    expect(SHADOW_SIGNAL_KEYS.length).toBe(38);
    expect(EXTRACTION_SIGNAL_KEYS.length).toBe(53);
    expect(MAX_EVIDENCE_ITEMS).toBe(57);
    expect(EXPANSION_14_SHADOW_SIGNAL_KEYS).toEqual([...expansion14Keys]);
  });

  it('keeps Expansion-14 keys out of scored compatibility set', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
    for (const k of expansion14Keys) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it('requires DOMAIN_ALLOWED membership on self + partner', () => {
    for (const k of expansion14Keys) {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
    }
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(45);
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(31);
  });

  it('exposes promotion-ready metadata matching Story 1', () => {
    expect(EXPANSION_14_PROMOTION_WEIGHTS.patienceTolerance).toBe(1.2);
    expect(EXPANSION_14_PROMOTION_WEIGHTS.intimacyPacing).toBe(1.3);
    expect(EXPANSION_14_PROMOTION_WEIGHTS.monogamyAlignment).toBe(1.6);
    expect(EXPANSION_14_PROMOTION_TIERS.patienceTolerance).toBe(2);
    expect(EXPANSION_14_PROMOTION_TIERS.intimacyPacing).toBe(1);
    expect(EXPANSION_14_PROMOTION_TIERS.monogamyAlignment).toBe(1);
    expect(EXPANSION_14_PROMOTION_DOMAINS.patienceTolerance).toBe('relationship');
    expect(EXPANSION_14_PROMOTION_DOMAINS.intimacyPacing).toBe('intimacy');
    expect(EXPANSION_14_PROMOTION_DOMAINS.monogamyAlignment).toBe(
      'relationship',
    );
    expect(EXPANSION_14_PROMOTION_CHIP_LABELS.patienceTolerance).toBe(
      'Patience with differences',
    );
    expect(EXPANSION_14_PROMOTION_CHIP_LABELS.intimacyPacing).toBe(
      'Pace of closeness',
    );
    expect(EXPANSION_14_PROMOTION_CHIP_LABELS.monogamyAlignment).toBe(
      'Relationship structure',
    );
  });

  it('exposes shadow positive chip labels and domains', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.patienceMatch).toBe('Patience match');
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.intimacyPaceAligned).toBe(
      'Pace of closeness',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.monogamyStructureAligned).toBe(
      'Aligned on relationship structure',
    );
    expect(SHADOW_SIGNAL_DOMAIN.patienceMatch).toBe('relationship');
    expect(SHADOW_SIGNAL_DOMAIN.intimacyPaceAligned).toBe('intimacy');
    expect(SHADOW_SIGNAL_DOMAIN.monogamyStructureAligned).toBe('relationship');
  });

  it('registers Expansion-14 tension rule ids', () => {
    const ids = new Set(tensionRules.map((r) => r.id));
    expect(ids.has('patience_tolerance_gap')).toBe(true);
    expect(ids.has('intimacy_pacing_clash')).toBe(true);
    expect(ids.has('monogamy_alignment_mismatch')).toBe(true);
  });
});
