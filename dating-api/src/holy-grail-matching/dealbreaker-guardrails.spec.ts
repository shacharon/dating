/**
 * Guardrails unit tests — confidence floor + kill switch.
 */

import {
  applyDealbreakerGuardrails,
  DEALBREAKER_HARD_MIN_CONFIDENCE,
  readDealbreakerHardDisabledTagsFromEnv,
  resetDealbreakerHardDisabledTagsCacheForTests,
  wouldDemoteHardDealbreaker,
} from './dealbreaker-guardrails';
import type { DealbreakerSignal } from './dealbreaker-signals-text.extract';
import { extractDealbreakerSignalsFromFreeText } from './dealbreaker-signals-text.extract';

function hardSmoking(confidence = 0.95): DealbreakerSignal {
  return {
    tag: 'smoking',
    classification: 'HARD_EXCLUDE',
    evidence: "don't want smokers",
    confidence,
  };
}

describe('applyDealbreakerGuardrails', () => {
  afterEach(() => {
    resetDealbreakerHardDisabledTagsCacheForTests();
    delete process.env['DEALBREAKER_HARD_DISABLED_TAGS'];
  });

  it('leaves high-confidence HARD unchanged when kill switch empty', () => {
    const s = hardSmoking(0.95);
    expect(applyDealbreakerGuardrails([s], { hardDisabledTags: new Set() })).toEqual([
      s,
    ]);
  });

  it('demotes HARD below confidence floor to SOFT', () => {
    const s = hardSmoking(DEALBREAKER_HARD_MIN_CONFIDENCE - 0.01);
    const out = applyDealbreakerGuardrails([s], { hardDisabledTags: new Set() });
    expect(out[0]).toMatchObject({
      tag: 'smoking',
      classification: 'SOFT',
      confidence: s.confidence,
    });
  });

  it('demotes HARD when tag is kill-switched', () => {
    const s = hardSmoking(0.95);
    const out = applyDealbreakerGuardrails([s], {
      hardDisabledTags: new Set(['smoking']),
    });
    expect(out[0]?.classification).toBe('SOFT');
  });

  it('does not upgrade SOFT to HARD', () => {
    const soft: DealbreakerSignal = {
      tag: 'smoking',
      classification: 'SOFT',
      evidence: "don't care about smoking",
      confidence: 0.65,
    };
    expect(
      applyDealbreakerGuardrails([soft], {
        hardDisabledTags: new Set(),
      }),
    ).toEqual([soft]);
  });

  it('readDealbreakerHardDisabledTagsFromEnv ignores unknown tags', () => {
    const set = readDealbreakerHardDisabledTagsFromEnv({
      DEALBREAKER_HARD_DISABLED_TAGS: 'smoking,not_a_real_tag,jealousy',
    } as NodeJS.ProcessEnv);
    expect([...set].sort()).toEqual(['jealousy', 'smoking']);
  });

  it('wouldDemoteHardDealbreaker mirrors apply rules', () => {
    expect(
      wouldDemoteHardDealbreaker(hardSmoking(0.5), { hardDisabledTags: new Set() }),
    ).toBe(true);
    expect(
      wouldDemoteHardDealbreaker(hardSmoking(0.95), {
        hardDisabledTags: new Set(['smoking']),
      }),
    ).toBe(true);
    expect(
      wouldDemoteHardDealbreaker(hardSmoking(0.95), { hardDisabledTags: new Set() }),
    ).toBe(false);
  });

  it('extractDealbreakerSignalsFromFreeText applies kill switch from process.env', () => {
    process.env['DEALBREAKER_HARD_DISABLED_TAGS'] = 'smoking';
    resetDealbreakerHardDisabledTagsCacheForTests();
    const ext = extractDealbreakerSignalsFromFreeText({
      aboutPartner: "I don't want smokers",
    });
    expect(ext.signals).toEqual([
      expect.objectContaining({
        tag: 'smoking',
        classification: 'SOFT',
      }),
    ]);
  });
});
