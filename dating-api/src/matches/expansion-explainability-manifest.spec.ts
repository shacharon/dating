import { buildExpansion01ShadowBreakdown } from './expansion-01-explainability';
import { buildExpansion02ShadowBreakdown } from './expansion-02-explainability';
import { buildExpansion03ShadowBreakdown } from './expansion-03-explainability';
import { buildExpansion04ShadowBreakdown } from './expansion-04-explainability';
import { buildExpansion05ShadowBreakdown } from './expansion-05-explainability';
import { buildExpansion06ShadowBreakdown } from './expansion-06-explainability';
import { buildExpansion07ShadowBreakdown } from './expansion-07-explainability';
import { buildExpansion10ShadowBreakdown } from './expansion-10-explainability';
import { buildExpansion11ShadowBreakdown } from './expansion-11-explainability';
import { buildExpansion12ShadowBreakdown } from './expansion-12-explainability';
import { buildExpansion13ShadowBreakdown } from './expansion-13-explainability';
import { buildExpansion14ShadowBreakdown } from './expansion-14-explainability';
import { buildExpansion15ShadowBreakdown } from './expansion-15-explainability';
import {
  buildAllExpansionShadowBreakdowns,
  expansionChipLabelForKey,
  expansionSignalDomainForKey,
  EXPANSION_EXPLAINABILITY_MANIFEST,
  isRegisteredExpansionShadowChipKey,
} from './expansion-explainability-manifest';

describe('expansion-explainability-manifest', () => {
  it('lists expansions in locked order (01–07, 10–15)', () => {
    const ids = EXPANSION_EXPLAINABILITY_MANIFEST.map((m) => m.id);
    expect(ids).toEqual([
      'expansion-01',
      'expansion-02',
      'expansion-03',
      'expansion-04',
      'expansion-05',
      'expansion-06',
      'expansion-07',
      'expansion-10',
      'expansion-11',
      'expansion-12',
      'expansion-13',
      'expansion-14',
      'expansion-15',
    ]);
    expect(ids).not.toContain('expansion-08');
    expect(ids).not.toContain('expansion-09');
  });

  it('resolves Expansion-01 chip label and domain via helpers', () => {
    expect(isRegisteredExpansionShadowChipKey('empathyCompassion')).toBe(true);
    expect(expansionChipLabelForKey('empathyCompassion')).toBe(
      'Understanding & care',
    );
    expect(expansionSignalDomainForKey('empathyCompassion')).toBe('emotional');
    expect(isRegisteredExpansionShadowChipKey('ambition')).toBe(false);
    expect(expansionChipLabelForKey('notARealShadowKey')).toBeUndefined();
    expect(expansionSignalDomainForKey('notARealShadowKey')).toBeUndefined();
  });

  it('buildAllExpansionShadowBreakdowns matches hand-spread of the same builders', () => {
    const signalsA: Record<string, number | null> = {
      empathyCompassion: 8,
      vulnerabilityOpenness: 7,
    };
    const signalsB: Record<string, number | null> = {
      empathyCompassion: 7,
      vulnerabilityOpenness: 8,
    };
    const expected = [
      ...buildExpansion01ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion02ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion03ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion04ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion05ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion06ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion07ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion10ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion11ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion12ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion13ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion14ShadowBreakdown(signalsA, signalsB),
      ...buildExpansion15ShadowBreakdown(signalsA, signalsB),
    ];
    expect(buildAllExpansionShadowBreakdowns(signalsA, signalsB)).toEqual(
      expected,
    );
  });
});
