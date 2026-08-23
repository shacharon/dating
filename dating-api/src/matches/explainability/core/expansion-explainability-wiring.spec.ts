import {
  EXPANSION_EXPLAINABILITY_CONFIGS,
  EXPANSION_07_CONFIG,
  EXPANSION_11_CONFIG,
  EXPANSION_12_CONFIG,
  EXPANSION_13_CONFIG,
  EXPANSION_14_CONFIG,
  EXPANSION_15_CONFIG,
} from './expansion-explainability-config';
import { EXPANSION_EXPLAINABILITY_MANIFEST } from './expansion-explainability-manifest';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_07,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_07,
  pickInterestOverlapTags,
} from '../expansions/01-07/expansion-07-explainability';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_11,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_11,
} from '../expansions/10-15/expansion-11-explainability';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_12,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_12,
} from '../expansions/10-15/expansion-12-explainability';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_13,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_13,
} from '../expansions/10-15/expansion-13-explainability';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_14,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_14,
} from '../expansions/10-15/expansion-14-explainability';
import {
  SHADOW_POSITIVE_CHIP_BY_SIGNAL as CHIP_15,
  SHADOW_SIGNAL_DOMAIN as DOMAIN_15,
} from '../expansions/10-15/expansion-15-explainability';

describe('expansion explainability wiring (sprint-60 story 3)', () => {
  it('manifest ids match config and exclude 08/09', () => {
    const configIds = EXPANSION_EXPLAINABILITY_CONFIGS.map((c) => c.id);
    const manifestIds = EXPANSION_EXPLAINABILITY_MANIFEST.map((m) => m.id);
    expect(manifestIds).toEqual(configIds);
    expect(manifestIds).not.toContain('expansion-08');
    expect(manifestIds).not.toContain('expansion-09');
  });

  it('custom module chip maps stay aligned with config SoT', () => {
    const pairs = [
      [EXPANSION_07_CONFIG, CHIP_07, DOMAIN_07],
      [EXPANSION_11_CONFIG, CHIP_11, DOMAIN_11],
      [EXPANSION_12_CONFIG, CHIP_12, DOMAIN_12],
      [EXPANSION_13_CONFIG, CHIP_13, DOMAIN_13],
      [EXPANSION_14_CONFIG, CHIP_14, DOMAIN_14],
      [EXPANSION_15_CONFIG, CHIP_15, DOMAIN_15],
    ] as const;

    for (const [cfg, chips, domains] of pairs) {
      expect(chips).toEqual(cfg.positiveChipBySignal);
      expect(domains).toEqual(cfg.signalDomain);
      for (const key of cfg.shadowChipKeys) {
        expect(chips[key as keyof typeof chips]).toBeDefined();
        expect(domains[key as keyof typeof domains]).toBeDefined();
      }
    }
  });

  it('pickInterestOverlapTags remains exported from expansion-07', () => {
    expect(typeof pickInterestOverlapTags).toBe('function');
    expect(pickInterestOverlapTags(['travel', 'books'])).toEqual([
      'travel',
      'books',
    ]);
  });
});
