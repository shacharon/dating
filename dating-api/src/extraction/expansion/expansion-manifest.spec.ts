import { EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-01-signal-definitions';
import { EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-02-signal-definitions';
import { EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-03-signal-definitions';
import { EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-04-signal-definitions';
import { EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-05-signal-definitions';
import { EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK } from './expansion-06-signal-definitions';
import {
  EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-07-signal-definitions';
import {
  EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-08-signal-definitions';
import { EXPANSION_09_INTEREST_GUIDANCE_BLOCK } from './expansion-09-interest-guidance';
import {
  EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-10-signal-definitions';
import {
  EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-11-signal-definitions';
import {
  EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-12-signal-definitions';
import {
  EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-13-signal-definitions';
import {
  EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-14-signal-definitions';
import {
  EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK,
  EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK,
} from './expansion-15-signal-definitions';
import {
  EXPANSION_PROMPT_MANIFEST,
  joinExpansionInterestGuidanceBlocks,
  joinExpansionPartnerShadowBlocks,
  joinExpansionSelfShadowBlocks,
} from './expansion-manifest';

describe('expansion-manifest (prompt registry)', () => {
  it('lists expansions 01–15 in locked order', () => {
    expect(EXPANSION_PROMPT_MANIFEST.map((m) => m.id)).toEqual([
      'expansion-01',
      'expansion-02',
      'expansion-03',
      'expansion-04',
      'expansion-05',
      'expansion-06',
      'expansion-07',
      'expansion-08',
      'expansion-09',
      'expansion-10',
      'expansion-11',
      'expansion-12',
      'expansion-13',
      'expansion-14',
      'expansion-15',
    ]);
  });

  it('joins self shadow blocks with \\n\\n parity vs hand splice', () => {
    const expected = [
      EXPANSION_01_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_02_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_03_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_04_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_05_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_06_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_07_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_08_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_10_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_11_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_12_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_13_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_14_SELF_SHADOW_SIGNAL_BLOCK,
      EXPANSION_15_SELF_SHADOW_SIGNAL_BLOCK,
    ].join('\n\n');
    expect(joinExpansionSelfShadowBlocks()).toBe(expected);
    expect(joinExpansionSelfShadowBlocks().length).toBeGreaterThan(100);
  });

  it('joins partner shadow blocks with \\n\\n parity vs hand splice', () => {
    const expected = [
      EXPANSION_07_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_08_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_10_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_11_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_12_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_13_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_14_PARTNER_SHADOW_SIGNAL_BLOCK,
      EXPANSION_15_PARTNER_SHADOW_SIGNAL_BLOCK,
    ].join('\n\n');
    expect(joinExpansionPartnerShadowBlocks()).toBe(expected);
    expect(joinExpansionPartnerShadowBlocks().length).toBeGreaterThan(100);
  });

  it('joins interest guidance as Expansion-09 only (today)', () => {
    expect(joinExpansionInterestGuidanceBlocks()).toBe(
      EXPANSION_09_INTEREST_GUIDANCE_BLOCK,
    );
  });
});
