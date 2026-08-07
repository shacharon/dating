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

  it('maps Conflict approach chip (Sprint 22)', () => {
    const traits = buildMatchExplanationTraits(['Conflict approach'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('How you communicate');
    expect(traits[0].label).toBe('Conflict approach');
    expect(traits[0].evidence).toBe(CHIP_TO_TRAIT['Conflict approach'].evidence);
  });

  it('maps Expansion-01 Understanding & care chip', () => {
    const traits = buildMatchExplanationTraits(['Understanding & care'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Emotional connection');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Understanding & care'].evidence,
    );
  });

  it('maps Expansion-02 Emotional balance chip', () => {
    const traits = buildMatchExplanationTraits(['Emotional balance'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Emotional connection');
    expect(traits[0].evidence).toBe(CHIP_TO_TRAIT['Emotional balance'].evidence);
  });

  it('maps Expansion-02 Affection rhythm match chip', () => {
    const traits = buildMatchExplanationTraits(['Affection rhythm match'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Physical connection');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Affection rhythm match'].evidence,
    );
  });

  it('maps Expansion-03 Shared playfulness chip', () => {
    const traits = buildMatchExplanationTraits(['Shared playfulness'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Connection & play');
    expect(traits[0].evidence).toBe(CHIP_TO_TRAIT['Shared playfulness'].evidence);
  });

  it('maps Expansion-04 Mental stimulation chip', () => {
    const traits = buildMatchExplanationTraits(['Mental stimulation'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Ideas & growth');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Mental stimulation'].evidence,
    );
  });

  it('maps Expansion-04 Creative expression chip', () => {
    const traits = buildMatchExplanationTraits(['Creative expression'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Creativity & making');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Creative expression'].evidence,
    );
  });

  it('maps Expansion-05 Activity level match chip', () => {
    const traits = buildMatchExplanationTraits(['Activity level match'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Lifestyle match');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Activity level match'].evidence,
    );
  });

  it('maps Expansion-05 Home/out balance chip', () => {
    const traits = buildMatchExplanationTraits(['Home/out balance'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Lifestyle match');
    expect(traits[0].evidence).toBe(CHIP_TO_TRAIT['Home/out balance'].evidence);
  });

  it('maps Expansion-06 Adventure & novelty chip', () => {
    const traits = buildMatchExplanationTraits(['Adventure & novelty'], 70);
    expect(traits).toHaveLength(1);
    expect(traits[0].group).toBe('Lifestyle match');
    expect(traits[0].evidence).toBe(
      CHIP_TO_TRAIT['Adventure & novelty'].evidence,
    );
  });

  it('maps Expansion-07 profile-gap chips', () => {
    const traits = buildMatchExplanationTraits(
      [
        'Intimacy expectations',
        'Support & arrangement style',
        'Financial support alignment',
        'Non-transactional match',
        'Religious practice',
      ],
      70,
    );
    expect(traits).toHaveLength(5);
    expect(traits[0].group).toBe('Physical connection');
    expect(traits[4].group).toBe('Values match');
    expect(traits[2].evidence).toBe(
      CHIP_TO_TRAIT['Financial support alignment'].evidence,
    );
  });
});
