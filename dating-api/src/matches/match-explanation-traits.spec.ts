import {
  buildMatchExplanationTraits,
  CHIP_TO_TRAIT,
} from './match-explanation-traits';

describe('buildMatchExplanationTraits', () => {
  it('maps 3 chips to 3 traits', () => {
    const traits = buildMatchExplanationTraits(
      ['Emotional depth', 'Social rhythm', 'Money mindset'],
      70,
    );
    expect(traits).toHaveLength(3);
    expect(traits[0].label).toBe('Emotional depth');
    expect(traits[1].label).toBe('Social rhythm');
    expect(traits[2].label).toBe('Money mindset');
    expect(traits.every((t) => t.strength === 'strong')).toBe(true);
  });

  it('0 chips returns []', () => {
    expect(buildMatchExplanationTraits([], 80)).toEqual([]);
  });

  it('1 chip returns 1 trait', () => {
    const traits = buildMatchExplanationTraits(['Direct communication'], 60);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('How you communicate');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Direct communication'].evidence,
    );
  });

  it('returns at most 5 traits', () => {
    const chips = [
      'Emotional depth',
      'Secure attachment',
      'Direct communication',
      'Social rhythm',
      'Wellness focus',
      'Lifestyle pace',
      'Physical chemistry',
    ];
    const traits = buildMatchExplanationTraits(chips, 72);
    expect(traits.length).toBeLessThanOrEqual(5);
    expect(traits.map((t) => t.label)).toEqual(chips.slice(0, 5));
  });

  it('is deterministic: same input always same output', () => {
    const chips = ['Shared values', 'Independence fit'];
    const a = buildMatchExplanationTraits(chips, 55);
    const b = buildMatchExplanationTraits(chips, 55);
    expect(a).toEqual(b);
  });

  it('uses strength strong when finalScore >= 65', () => {
    const traits = buildMatchExplanationTraits(['Ambition alignment'], 65);
    expect(traits[0].strength).toBe('strong');
  });

  it('uses strength moderate when finalScore < 65', () => {
    const traits = buildMatchExplanationTraits(['Ambition alignment'], 64);
    expect(traits[0].strength).toBe('moderate');
  });

  it('filters unknown chips', () => {
    const traits = buildMatchExplanationTraits(
      ['Emotional depth', 'Totally Unknown Chip', 'Money mindset'],
      80,
    );
    expect(traits).toHaveLength(2);
    expect(traits.map((t) => t.label)).toEqual([
      'Emotional depth',
      'Money mindset',
    ]);
  });
});
