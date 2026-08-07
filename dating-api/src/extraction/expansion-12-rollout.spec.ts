import { COMPATIBILITY_SIGNAL_KEYS } from '../compatibility/compatibility-score';
import { DOMAIN_ALLOWED_SIGNAL_KEYS } from './extraction-strict-validation';
import {
  EXTRACTION_SIGNAL_KEYS,
  MAX_EVIDENCE_ITEMS,
  SHADOW_SIGNAL_KEYS,
} from './extracted-signals.interface';
import {
  EXPANSION_12_PROMOTION_CHIP_LABELS,
  EXPANSION_12_PROMOTION_DOMAINS,
  EXPANSION_12_PROMOTION_TIERS,
  EXPANSION_12_PROMOTION_WEIGHTS,
  EXPANSION_12_SHADOW_SIGNAL_KEYS,
} from './expansion-12-signal-definitions';
import { SHADOW_POSITIVE_CHIP_BY_SIGNAL } from '../matches/expansion-12-explainability';
import { tensionRules } from '../engine/tension-rules';

describe('Expansion-12 rollout gate', () => {
  const expansion12Keys = ['listeningPresence', 'emotionalExpression'] as const;

  it('keeps shadow membership and extraction counts', () => {
    for (const k of expansion12Keys) {
      expect(SHADOW_SIGNAL_KEYS).toContain(k);
    }
    expect(SHADOW_SIGNAL_KEYS.length).toBe(32);
    expect(EXTRACTION_SIGNAL_KEYS.length).toBe(47);
    expect(MAX_EVIDENCE_ITEMS).toBe(51);
    expect(EXPANSION_12_SHADOW_SIGNAL_KEYS).toEqual([...expansion12Keys]);
  });

  it('keeps Expansion-12 keys out of scored compatibility set', () => {
    expect(COMPATIBILITY_SIGNAL_KEYS).toHaveLength(15);
    for (const k of expansion12Keys) {
      expect(COMPATIBILITY_SIGNAL_KEYS as readonly string[]).not.toContain(k);
    }
  });

  it('requires DOMAIN_ALLOWED membership on self + partner', () => {
    for (const k of expansion12Keys) {
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner).toContain(k);
      expect(DOMAIN_ALLOWED_SIGNAL_KEYS.relationship).not.toContain(k);
    }
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.self.length).toBe(39);
    expect(DOMAIN_ALLOWED_SIGNAL_KEYS.partner.length).toBe(25);
  });

  it('exposes promotion-ready metadata matching Story 1', () => {
    expect(EXPANSION_12_PROMOTION_WEIGHTS.listeningPresence).toBe(1.3);
    expect(EXPANSION_12_PROMOTION_WEIGHTS.emotionalExpression).toBe(1.2);
    expect(EXPANSION_12_PROMOTION_TIERS.listeningPresence).toBe(2);
    expect(EXPANSION_12_PROMOTION_TIERS.emotionalExpression).toBe(2);
    expect(EXPANSION_12_PROMOTION_DOMAINS.listeningPresence).toBe(
      'communication',
    );
    expect(EXPANSION_12_PROMOTION_DOMAINS.emotionalExpression).toBe('emotional');
    expect(EXPANSION_12_PROMOTION_CHIP_LABELS.listeningPresence).toBe(
      'Quality listening',
    );
    expect(EXPANSION_12_PROMOTION_CHIP_LABELS.emotionalExpression).toBe(
      'Expressiveness',
    );
  });

  it('exposes shadow positive chip labels', () => {
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.emotionalExpression).toBe(
      'Expressiveness match',
    );
    expect(SHADOW_POSITIVE_CHIP_BY_SIGNAL.listeningFeelsHeard).toBe(
      'Feels heard',
    );
  });

  it('registers Expansion-12 tension rule ids', () => {
    const ids = new Set(tensionRules.map((r) => r.id));
    expect(ids.has('listening_presence_gap')).toBe(true);
    expect(ids.has('emotional_expression_gap')).toBe(true);
  });
});
