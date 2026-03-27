import type { BreakdownEntry } from '../compatibility/compatibility-score';
import type { SignalKey } from '../compatibility/compatibility-score';
import { BOILERPLATE_REASON_MARKERS } from './explainability-review-heuristics';
import {
  buildMatchExplainability,
  buildReasonShort,
  pickPositiveChips,
  POSITIVE_CHIP_BY_SIGNAL,
  SIGNAL_DOMAIN,
  TENSION_CHIP_BY_ID,
} from './match-explainability';

function domainsForChipLabels(chips: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const chip of chips) {
    const keys = (Object.keys(POSITIVE_CHIP_BY_SIGNAL) as SignalKey[]).filter(
      (k) => POSITIVE_CHIP_BY_SIGNAL[k] === chip,
    );
    const domain = keys.length ? SIGNAL_DOMAIN[keys[0]!] : 'unknown';
    counts.set(domain, (counts.get(domain) ?? 0) + 1);
  }
  return counts;
}

describe('pickPositiveChips', () => {
  it('prefers both sides >= 7 and caps at 3 unique labels', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'directness', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'emotionalDepth', self: 7, partner: 7, gap: 0, pairScore: 10 },
      { key: 'traditionalism', self: 7, partner: 7, gap: 0, pairScore: 9 },
      { key: 'spirituality', self: 7, partner: 7, gap: 0, pairScore: 8 },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toEqual(['Direct communication', 'Emotional depth', 'Shared values']);
  });

  it('dedupes labels that map from multiple keys', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'traditionalism', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'spirituality', self: 8, partner: 8, gap: 0, pairScore: 9 },
    ];
    expect(pickPositiveChips(breakdown)).toEqual(['Shared values']);
  });

  it('falls back to pairScore tiers when min(self,partner) < 7', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'ambition', self: 5, partner: 5, gap: 0, pairScore: 10 },
      { key: 'socialBattery', self: 4, partner: 4, gap: 0, pairScore: 10 },
    ];
    expect(pickPositiveChips(breakdown)).toEqual(['Ambition alignment', 'Social rhythm']);
  });

  it('does not fill all 3 slots from the same domain when a strong alternative exists', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'healthBodyConsciousness', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'lifestylePace', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'physicalPriority', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'emotionalDepth', self: 7, partner: 7, gap: 0, pairScore: 9 },
      { key: 'ambition', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'financialMindset', self: 8, partner: 8, gap: 0, pairScore: 10 },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Emotional depth');
    const byDomain = domainsForChipLabels(chips);
    expect(byDomain.get('lifestyle') ?? 0).toBeLessThanOrEqual(2);
    expect(byDomain.get('ambition_money') ?? 0).toBeLessThanOrEqual(1);
    expect(new Set(chips).size).toBe(chips.length);
  });
});

describe('buildMatchExplainability', () => {
  it('omits tensionChip when friction < 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 72,
      finalScore: 72,
      friction: 2,
      breakdown: [
        { key: 'directness', self: 8, partner: 8, gap: 0, pairScore: 10 },
      ],
      tensionMatrix: [{ id: 'fusion_vs_boundaries', penalty: 7 }],
    });
    expect(dto.positiveChips).toContain('Direct communication');
    expect(dto.tensionChip).toBeUndefined();
    expect(dto.reasonShort.toLowerCase()).not.toContain('tension');
    expect(dto.reasonShort.toLowerCase()).not.toContain('friction point');
  });

  it('adds tensionChip from highest penalty rule when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 4,
      breakdown: [
        { key: 'relationshipClarity', self: 8, partner: 8, gap: 0, pairScore: 10 },
      ],
      tensionMatrix: [
        { id: 'lifestyle_pace_mismatch', penalty: 2 },
        { id: 'fusion_vs_boundaries', penalty: 7 },
      ],
    });
    expect(dto.tensionChip).toBe(TENSION_CHIP_BY_ID.fusion_vs_boundaries);
    expect(dto.reasonShort.toLowerCase()).toMatch(/closeness vs space|main tension|friction point/);
  });

  it('breaks penalty ties by id lexicographically', () => {
    const dto = buildMatchExplainability({
      compatibility: 60,
      finalScore: 28,
      friction: 5,
      breakdown: [],
      tensionMatrix: [
        { id: 'zebra_rule', penalty: 3 },
        { id: 'alpha_rule', penalty: 3 },
      ],
    });
    expect(dto.tensionChip).toBe('alpha rule');
  });

  it('is deterministic for identical input', () => {
    const input = {
      compatibility: 68,
      finalScore: 68,
      friction: 3,
      breakdown: [
        { key: 'emotionalDepth', self: 7, partner: 7, gap: 0, pairScore: 10 },
        { key: 'directness', self: 7, partner: 7, gap: 0, pairScore: 9 },
      ] as BreakdownEntry[],
      tensionMatrix: [{ id: 'social_battery_mismatch', penalty: 3 }],
    };
    expect(buildMatchExplainability(input)).toEqual(buildMatchExplainability(input));
  });
});

describe('buildReasonShort', () => {
  it('ties tone to finalScore bands and avoids optimistic words when finalScore < 60', () => {
    const high = buildReasonShort(85, 0, ['Direct communication'], undefined, []);
    const solidBand = buildReasonShort(68, 0, ['Direct communication'], undefined, []);
    const moderate = buildReasonShort(55, 0, ['Direct communication'], undefined, []);
    const weak = buildReasonShort(19, 0, ['Direct communication'], undefined, []);
    const highLower = high.toLowerCase();
    const solidLower = solidBand.toLowerCase();
    const modLower = moderate.toLowerCase();
    const weakLower = weak.toLowerCase();
    expect(highLower).toMatch(/strong|clear/);
    expect(solidLower).toContain('solid');
    expect(modLower).not.toContain('solid');
    expect(modLower).not.toMatch(/\bstrong\b/);
    expect(weakLower).not.toContain('solid');
    expect(weakLower).not.toMatch(/\bstrong\b/);
    expect(highLower).not.toContain('strong overlap');
    expect(highLower).not.toContain('overlap on');
    expect(modLower).toContain('primary overlap on');
    expect(modLower).toContain('moderate');
    expect(weakLower).toContain('overall this looks weak');
    expect(weakLower).toContain('small overlap on');
  });

  it('mid 50–59 single chip always includes secondary alignment (named or fallback)', () => {
    const withNamed: BreakdownEntry[] = [
      { key: 'socialBattery', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'emotionalDepth', self: 5, partner: 5, gap: 0, pairScore: 6 },
    ];
    const named = buildReasonShort(55, 0, ['Social rhythm'], undefined, withNamed);
    expect(named).toMatch(/Primary overlap on Social rhythm; there's also some alignment on Emotional depth/);

    const fallback = buildReasonShort(58, 0, ['Direct communication'], undefined, []);
    expect(fallback).toContain('Primary overlap on Direct communication');
    expect(fallback).toContain('other areas that score softer');
  });

  it('uses plural agreement for multiple chips in partial band when template uses chip list as subject', () => {
    const t = buildReasonShort(42, 0, ['Social rhythm', 'Direct communication'], undefined, []);
    expect(
      t.includes('are the main places where some alignment shows up') ||
        t.includes('capture a partial fit'),
    ).toBe(true);
  });

  it('never uses solid or strong for low finalScore even with many chips', () => {
    const chips = ['Social rhythm', 'Direct communication', 'Independence fit'];
    const s = buildReasonShort(46, 3, chips, 'Emotional depth gap', []).toLowerCase();
    expect(s).not.toContain('solid');
    expect(s).not.toMatch(/\bstrong\b/);
    expect(s).toMatch(/moderate|partial|mixed|overlap/);
  });

  it('appends a softer secondary dimension when exactly one chip and pairScore ≥ 5 exists elsewhere', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'ambition', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'socialBattery', self: 5, partner: 5, gap: 0, pairScore: 7 },
    ];
    const s = buildReasonShort(62, 0, ['Ambition alignment'], undefined, breakdown);
    expect(s).toContain('Softer overlap also shows around');
    expect(s).toContain('Social rhythm');
  });

  it('varies sentence shape across finalScore bands for the same chips', () => {
    const chips = ['Direct communication', 'Emotional depth'];
    const r70 = buildReasonShort(72, 0, chips, undefined, []);
    const r55 = buildReasonShort(58, 0, chips, undefined, []);
    const r40 = buildReasonShort(42, 0, chips, undefined, []);
    const unique = new Set([r70, r55, r40]);
    expect(unique.size).toBe(3);
  });

  it('does not emit review boilerplate when chips are empty but pairScore ≥ 6 exists', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'ambition', self: 4, partner: 4, gap: 0, pairScore: 6 },
    ];
    const s = buildReasonShort(60, 0, [], undefined, breakdown);
    const lower = s.toLowerCase();
    for (const m of BOILERPLATE_REASON_MARKERS) {
      expect(lower).not.toContain(m.toLowerCase());
    }
    expect(s.length).toBeGreaterThanOrEqual(28);
    expect(s).toContain('Ambition alignment');
  });

  it('uses natural fallback copy when chips empty and no pairScore ≥ 6', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'ambition', self: 3, partner: 3, gap: 0, pairScore: 4 },
    ];
    const s = buildReasonShort(60, 0, [], undefined, breakdown);
    expect(s.toLowerCase()).not.toContain('limited highlighted alignments');
    expect(s.length).toBeGreaterThanOrEqual(28);
  });
});
