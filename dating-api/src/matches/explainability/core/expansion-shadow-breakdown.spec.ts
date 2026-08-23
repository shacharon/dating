import { computePairScore } from '../../../compatibility/compatibility-score';
import {
  EXPANSION_01_CONFIG,
  EXPANSION_02_CONFIG,
  EXPANSION_03_CONFIG,
  EXPANSION_04_CONFIG,
  EXPANSION_05_CONFIG,
  EXPANSION_06_CONFIG,
  EXPANSION_10_CONFIG,
} from './expansion-explainability-config';
import { buildStandardShadowBreakdown } from './expansion-shadow-breakdown';
import { buildExpansion01ShadowBreakdown } from '../expansions/01-07/expansion-01-explainability';
import { buildExpansion02ShadowBreakdown } from '../expansions/01-07/expansion-02-explainability';
import { buildExpansion03ShadowBreakdown } from '../expansions/01-07/expansion-03-explainability';
import { buildExpansion04ShadowBreakdown } from '../expansions/01-07/expansion-04-explainability';
import { buildExpansion05ShadowBreakdown } from '../expansions/01-07/expansion-05-explainability';
import { buildExpansion06ShadowBreakdown } from '../expansions/01-07/expansion-06-explainability';
import { buildExpansion10ShadowBreakdown } from '../expansions/10-15/expansion-10-explainability';

describe('buildStandardShadowBreakdown (sprint-60 story 3)', () => {
  const signalsA: Record<string, number | null> = {
    empathyCompassion: 8,
    vulnerabilityOpenness: 6,
    emotionalRegulation: 7,
    physicalAffectionStyle: 5,
    humorPlayfulness: 9,
    intellectualCuriosity: 4,
    creativeExpression: 8,
    physicalActivityLevel: 6,
    domesticComfort: 7,
    adventureNovelty: 5,
    repairSkills: 8,
    forgivenessStyle: 3,
  };
  const signalsB: Record<string, number | null> = {
    empathyCompassion: 5,
    vulnerabilityOpenness: 6,
    emotionalRegulation: 9,
    physicalAffectionStyle: 5,
    humorPlayfulness: 2,
    intellectualCuriosity: 8,
    creativeExpression: null,
    physicalActivityLevel: 6,
    domesticComfort: 4,
    adventureNovelty: 5,
    repairSkills: 8,
    forgivenessStyle: 9,
  };

  const cases = [
    ['expansion-01', EXPANSION_01_CONFIG, buildExpansion01ShadowBreakdown],
    ['expansion-02', EXPANSION_02_CONFIG, buildExpansion02ShadowBreakdown],
    ['expansion-03', EXPANSION_03_CONFIG, buildExpansion03ShadowBreakdown],
    ['expansion-04', EXPANSION_04_CONFIG, buildExpansion04ShadowBreakdown],
    ['expansion-05', EXPANSION_05_CONFIG, buildExpansion05ShadowBreakdown],
    ['expansion-06', EXPANSION_06_CONFIG, buildExpansion06ShadowBreakdown],
    ['expansion-10', EXPANSION_10_CONFIG, buildExpansion10ShadowBreakdown],
  ] as const;

  it.each(cases)('%s shim matches standard builder', (_id, cfg, build) => {
    const viaStandard = buildStandardShadowBreakdown(
      cfg.shadowChipKeys,
      signalsA,
      signalsB,
    );
    const viaShim = build(signalsA, signalsB);
    expect(viaShim).toEqual(viaStandard);
  });

  it('computes gap and pairScore like legacy loop', () => {
    const out = buildStandardShadowBreakdown(
      ['empathyCompassion'],
      signalsA,
      signalsB,
    );
    expect(out).toEqual([
      {
        key: 'empathyCompassion',
        self: 8,
        partner: 5,
        gap: 3,
        pairScore: computePairScore(8, 5),
      },
    ]);
  });
});
