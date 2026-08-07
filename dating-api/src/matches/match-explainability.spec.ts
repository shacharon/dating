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
  it('prefers both sides >= 7 and caps at 5 unique labels', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'directness', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'emotionalDepth', self: 7, partner: 7, gap: 0, pairScore: 10 },
      { key: 'traditionalism', self: 7, partner: 7, gap: 0, pairScore: 9 },
      { key: 'ambition', self: 7, partner: 7, gap: 0, pairScore: 8 },
      { key: 'socialBattery', self: 7, partner: 7, gap: 0, pairScore: 8 },
      { key: 'independence', self: 7, partner: 7, gap: 0, pairScore: 7 },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toHaveLength(5);
    expect(chips).toEqual([
      'Direct communication',
      'Emotional depth',
      'Shared values',
      'Ambition alignment',
      'Social rhythm',
    ]);
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

  it('does not fill all slots from the same domain when a strong alternative exists', () => {
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
    expect(chips).toHaveLength(5);
    const byDomain = domainsForChipLabels(chips);
    expect(byDomain.get('lifestyle') ?? 0).toBeLessThanOrEqual(2);
    expect(byDomain.get('ambition_money') ?? 0).toBeLessThanOrEqual(2);
    expect(new Set(chips).size).toBe(chips.length);
  });

  it('includes Expansion-01 shadow chips when breakdown has high shadow entries', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'empathyCompassion',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'vulnerabilityOpenness',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Understanding & care');
    expect(chips).toContain('Authentic openness');
  });

  it('includes Expansion-02 shadow chips when breakdown has high shadow entries', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'emotionalRegulation',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'physicalAffectionStyle',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Emotional balance');
    expect(chips).toContain('Affection rhythm match');
  });

  it('includes Expansion-03 shadow chip when breakdown has high humorPlayfulness', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'humorPlayfulness',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Shared playfulness');
  });

  it('includes Expansion-04 shadow chips when breakdown has high intellectual and creative entries', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'intellectualCuriosity',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'creativeExpression',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Mental stimulation');
    expect(chips).toContain('Creative expression');
  });

  it('includes Expansion-05 shadow chips when breakdown has high activity and domestic entries', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'physicalActivityLevel',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'domesticComfort',
        self: 7,
        partner: 7,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Activity level match');
    expect(chips).toContain('Home/out balance');
  });

  it('includes Expansion-06 shadow chip when breakdown has high adventureNovelty', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'adventureNovelty',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Adventure & novelty');
  });

  it('includes Expansion-07 shadow chips when breakdown has high profile-gap entries', () => {
    const breakdown: BreakdownEntry[] = [
      {
        key: 'casualIntimacyIntent',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'religiousObservance',
        self: 8,
        partner: 8,
        gap: 0,
        pairScore: 10,
      },
      {
        key: 'supportFinancialAlignment',
        self: 9,
        partner: 9,
        gap: 0,
        pairScore: 10,
      },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Intimacy expectations');
    expect(chips).toContain('Religious practice');
    expect(chips).toContain('Financial support alignment');
  });

  it('emits interestOverlapTags (max 2 preferred) from sharedInterests', () => {
    const dto = buildMatchExplainability({
      compatibility: 70,
      finalScore: 70,
      friction: 0,
      breakdown: [],
      tensionMatrix: [],
      sharedInterests: ['Travel', 'books', 'gaming'],
    });
    expect(dto.interestOverlapTags).toEqual(['travel', 'books']);
    expect(dto.sharedInterestNote).toBeDefined();
  });

  it('Phase 1 EQ: high shadow breakdown yields chips from multiple domains including connection', () => {
    const breakdown: BreakdownEntry[] = [
      { key: 'empathyCompassion', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'vulnerabilityOpenness', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'emotionalRegulation', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'physicalAffectionStyle', self: 8, partner: 8, gap: 0, pairScore: 10 },
      { key: 'humorPlayfulness', self: 8, partner: 8, gap: 0, pairScore: 10 },
    ];
    const chips = pickPositiveChips(breakdown);
    expect(chips).toContain('Shared playfulness');
    expect(chips).toHaveLength(5);
    const emotionalLabels = new Set([
      'Understanding & care',
      'Authentic openness',
      'Emotional balance',
    ]);
    const emotionalCount = chips.filter((c) => emotionalLabels.has(c)).length;
    // Domain diversity should leave room for connection/intimacy chips (not all-emotional).
    expect(emotionalCount).toBeLessThanOrEqual(3);
    expect(chips.some((c) => !emotionalLabels.has(c))).toBe(true);
  });
});

describe('buildMatchExplainability', () => {
  it('maps Expansion-01 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.empathy_gap).toBe('Empathy mismatch');
    expect(TENSION_CHIP_BY_ID.vulnerability_mismatch).toBe('Openness vs walls');
  });

  it('maps Expansion-02 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.emotional_volatility_gap).toBe(
      'Emotional steadiness gap',
    );
    expect(TENSION_CHIP_BY_ID.affection_needs_gap).toBe('Different affection needs');
  });

  it('maps Expansion-03 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.humor_mismatch).toBe('Playfulness mismatch');
  });

  it('maps Expansion-04 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.intellectual_gap).toBe(
      'Different mental stimulation needs',
    );
    expect(TENSION_CHIP_BY_ID.creative_mismatch).toBe('Creative drive mismatch');
  });

  it('maps Expansion-05 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.activity_level_gap).toBe('Different activity levels');
    expect(TENSION_CHIP_BY_ID.domestic_out_mismatch).toBe('Home vs out mismatch');
  });

  it('maps Expansion-06 tension rule id to chip label', () => {
    expect(TENSION_CHIP_BY_ID.novelty_routine_clash).toBe('Novelty vs routine');
  });

  it('maps Expansion-07 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.casual_intimacy_clash).toBe(
      'Casual vs committed intimacy',
    );
    expect(TENSION_CHIP_BY_ID.support_exchange_mismatch).toBe(
      'Arrangement vs romance',
    );
    expect(TENSION_CHIP_BY_ID.support_both_provider).toBe('Both want to provide');
    expect(TENSION_CHIP_BY_ID.support_both_recipient).toBe('Both seek support');
    expect(TENSION_CHIP_BY_ID.religious_observance_gap).toBe(
      'Religious practice gap',
    );
  });

  it('maps Expansion-08 tension rule ids to chip labels', () => {
    expect(TENSION_CHIP_BY_ID.education_level_gap).toBe('Education expectations');
    expect(TENSION_CHIP_BY_ID.honesty_integrity_gap).toBe('Honesty values gap');
    expect(TENSION_CHIP_BY_ID.chronotype_clash).toBe('Morning vs night');
    expect(TENSION_CHIP_BY_ID.physical_type_specificity_clash).toBeUndefined();
  });

  it('shows empathy_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 4,
      breakdown: [],
      tensionMatrix: [{ id: 'empathy_gap', penalty: 4 }],
    });
    expect(dto.tensionChip).toBe('Empathy mismatch');
  });

  it('shows emotional_volatility_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 5,
      breakdown: [],
      tensionMatrix: [{ id: 'emotional_volatility_gap', penalty: 5 }],
    });
    expect(dto.tensionChip).toBe('Emotional steadiness gap');
  });

  it('shows humor_mismatch tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 3,
      breakdown: [],
      tensionMatrix: [{ id: 'humor_mismatch', penalty: 3 }],
    });
    expect(dto.tensionChip).toBe('Playfulness mismatch');
  });

  it('shows intellectual_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 4,
      breakdown: [],
      tensionMatrix: [{ id: 'intellectual_gap', penalty: 4 }],
    });
    expect(dto.tensionChip).toBe('Different mental stimulation needs');
  });

  it('shows activity_level_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 3,
      breakdown: [],
      tensionMatrix: [{ id: 'activity_level_gap', penalty: 3 }],
    });
    expect(dto.tensionChip).toBe('Different activity levels');
  });

  it('shows domestic_out_mismatch tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 3,
      breakdown: [],
      tensionMatrix: [{ id: 'domestic_out_mismatch', penalty: 3 }],
    });
    expect(dto.tensionChip).toBe('Home vs out mismatch');
  });

  it('shows novelty_routine_clash tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 4,
      breakdown: [],
      tensionMatrix: [{ id: 'novelty_routine_clash', penalty: 4 }],
    });
    expect(dto.tensionChip).toBe('Novelty vs routine');
  });

  it('shows casual_intimacy_clash tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 6,
      breakdown: [],
      tensionMatrix: [{ id: 'casual_intimacy_clash', penalty: 6 }],
    });
    expect(dto.tensionChip).toBe('Casual vs committed intimacy');
  });

  it('shows religious_observance_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 5,
      breakdown: [],
      tensionMatrix: [{ id: 'religious_observance_gap', penalty: 5 }],
    });
    expect(dto.tensionChip).toBe('Religious practice gap');
  });

  it('shows honesty_integrity_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 5,
      breakdown: [],
      tensionMatrix: [{ id: 'honesty_integrity_gap', penalty: 5 }],
    });
    expect(dto.tensionChip).toBe('Honesty values gap');
  });

  it('shows chronotype_clash tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 3,
      breakdown: [],
      tensionMatrix: [{ id: 'chronotype_clash', penalty: 3 }],
    });
    expect(dto.tensionChip).toBe('Morning vs night');
  });

  it('shows education_level_gap tension chip when friction >= 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 4,
      breakdown: [],
      tensionMatrix: [{ id: 'education_level_gap', penalty: 4 }],
    });
    expect(dto.tensionChip).toBe('Education expectations');
  });

  it('omits tensionChip for creative_mismatch alone when friction < 3', () => {
    const dto = buildMatchExplainability({
      compatibility: 55,
      finalScore: 55,
      friction: 2,
      breakdown: [],
      tensionMatrix: [{ id: 'creative_mismatch', penalty: 2 }],
    });
    expect(dto.tensionChip).toBeUndefined();
  });

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
