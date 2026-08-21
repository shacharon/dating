/**
 * Expansion explainability config — chip keys, labels, domains (Sprint 60 Story 3).
 * Explainability-only SoT (not extraction prompts). 13 modules: 01–07, 10–15 (no 08/09).
 */

export type ExpansionExplainabilityKind = 'standard' | 'custom';

export type ExpansionExplainabilityConfig = {
  readonly id: string;
  readonly shadowChipKeys: readonly string[];
  readonly positiveChipBySignal: Readonly<Record<string, string>>;
  readonly signalDomain: Readonly<Record<string, string>>;
  readonly kind: ExpansionExplainabilityKind;
};

export const EXPANSION_01_CONFIG = {
  id: 'expansion-01',
  kind: 'standard',
  shadowChipKeys: ['empathyCompassion', 'vulnerabilityOpenness'],
  positiveChipBySignal: {
    empathyCompassion: 'Understanding & care',
    vulnerabilityOpenness: 'Authentic openness',
  },
  signalDomain: {
    empathyCompassion: 'emotional',
    vulnerabilityOpenness: 'emotional',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_02_CONFIG = {
  id: 'expansion-02',
  kind: 'standard',
  shadowChipKeys: ['emotionalRegulation', 'physicalAffectionStyle'],
  positiveChipBySignal: {
    emotionalRegulation: 'Emotional balance',
    physicalAffectionStyle: 'Affection rhythm match',
  },
  signalDomain: {
    emotionalRegulation: 'emotional',
    physicalAffectionStyle: 'intimacy',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_03_CONFIG = {
  id: 'expansion-03',
  kind: 'standard',
  shadowChipKeys: ['humorPlayfulness'],
  positiveChipBySignal: {
    humorPlayfulness: 'Shared playfulness',
  },
  signalDomain: {
    humorPlayfulness: 'connection',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_04_CONFIG = {
  id: 'expansion-04',
  kind: 'standard',
  shadowChipKeys: ['intellectualCuriosity', 'creativeExpression'],
  positiveChipBySignal: {
    intellectualCuriosity: 'Mental stimulation',
    creativeExpression: 'Creative expression',
  },
  signalDomain: {
    intellectualCuriosity: 'intellectual',
    creativeExpression: 'creative',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_05_CONFIG = {
  id: 'expansion-05',
  kind: 'standard',
  shadowChipKeys: ['physicalActivityLevel', 'domesticComfort'],
  positiveChipBySignal: {
    physicalActivityLevel: 'Activity level match',
    domesticComfort: 'Home/out balance',
  },
  signalDomain: {
    physicalActivityLevel: 'lifestyle',
    domesticComfort: 'lifestyle',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_06_CONFIG = {
  id: 'expansion-06',
  kind: 'standard',
  shadowChipKeys: ['adventureNovelty'],
  positiveChipBySignal: {
    adventureNovelty: 'Adventure & novelty',
  },
  signalDomain: {
    adventureNovelty: 'lifestyle',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_07_CONFIG = {
  id: 'expansion-07',
  kind: 'custom',
  shadowChipKeys: [
    'casualIntimacyIntent',
    'supportExchangeOrientation',
    'religiousObservance',
    'supportFinancialAlignment',
    'supportNonTransactional',
  ],
  positiveChipBySignal: {
    casualIntimacyIntent: 'Intimacy expectations',
    supportExchangeOrientation: 'Support & arrangement style',
    religiousObservance: 'Religious practice',
    supportFinancialAlignment: 'Financial support alignment',
    supportNonTransactional: 'Non-transactional match',
  },
  signalDomain: {
    casualIntimacyIntent: 'intimacy',
    supportExchangeOrientation: 'relationship',
    religiousObservance: 'values',
    supportFinancialAlignment: 'relationship',
    supportNonTransactional: 'relationship',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_10_CONFIG = {
  id: 'expansion-10',
  kind: 'standard',
  shadowChipKeys: ['repairSkills', 'forgivenessStyle'],
  positiveChipBySignal: {
    repairSkills: 'Conflict recovery',
    forgivenessStyle: 'Letting go & moving forward',
  },
  signalDomain: {
    repairSkills: 'communication',
    forgivenessStyle: 'communication',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_11_CONFIG = {
  id: 'expansion-11',
  kind: 'custom',
  shadowChipKeys: ['stressResponse', 'jealousySecureTrusting'],
  positiveChipBySignal: {
    stressResponse: 'Support under pressure',
    jealousySecureTrusting: 'Secure & trusting',
  },
  signalDomain: {
    stressResponse: 'emotional',
    jealousySecureTrusting: 'emotional',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_12_CONFIG = {
  id: 'expansion-12',
  kind: 'custom',
  shadowChipKeys: ['emotionalExpression', 'listeningFeelsHeard'],
  positiveChipBySignal: {
    emotionalExpression: 'Expressiveness match',
    listeningFeelsHeard: 'Feels heard',
  },
  signalDomain: {
    emotionalExpression: 'emotional',
    listeningFeelsHeard: 'communication',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_13_CONFIG = {
  id: 'expansion-13',
  kind: 'custom',
  shadowChipKeys: ['growthGrowsTogether', 'selfAwarenessMatch'],
  positiveChipBySignal: {
    growthGrowsTogether: 'Grows together',
    selfAwarenessMatch: 'Self-awareness match',
  },
  signalDomain: {
    growthGrowsTogether: 'personal',
    selfAwarenessMatch: 'personal',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_14_CONFIG = {
  id: 'expansion-14',
  kind: 'custom',
  shadowChipKeys: [
    'patienceMatch',
    'intimacyPaceAligned',
    'monogamyStructureAligned',
  ],
  positiveChipBySignal: {
    patienceMatch: 'Patience match',
    intimacyPaceAligned: 'Pace of closeness',
    monogamyStructureAligned: 'Aligned on relationship structure',
  },
  signalDomain: {
    patienceMatch: 'relationship',
    intimacyPaceAligned: 'intimacy',
    monogamyStructureAligned: 'relationship',
  },
} as const satisfies ExpansionExplainabilityConfig;

export const EXPANSION_15_CONFIG = {
  id: 'expansion-15',
  kind: 'custom',
  shadowChipKeys: [
    'familyStyleMatch',
    'friendCoupleAligned',
    'rechargeStyleMatch',
  ],
  positiveChipBySignal: {
    familyStyleMatch: 'Family style match',
    friendCoupleAligned: 'Friends & couple balance',
    rechargeStyleMatch: 'Recharge style match',
  },
  signalDomain: {
    familyStyleMatch: 'relationship',
    friendCoupleAligned: 'social',
    rechargeStyleMatch: 'social',
  },
} as const satisfies ExpansionExplainabilityConfig;

/** Ordered SoT — 13 explainability modules (no expansion-08/09). */
export const EXPANSION_EXPLAINABILITY_CONFIGS: readonly ExpansionExplainabilityConfig[] =
  [
    EXPANSION_01_CONFIG,
    EXPANSION_02_CONFIG,
    EXPANSION_03_CONFIG,
    EXPANSION_04_CONFIG,
    EXPANSION_05_CONFIG,
    EXPANSION_06_CONFIG,
    EXPANSION_07_CONFIG,
    EXPANSION_10_CONFIG,
    EXPANSION_11_CONFIG,
    EXPANSION_12_CONFIG,
    EXPANSION_13_CONFIG,
    EXPANSION_14_CONFIG,
    EXPANSION_15_CONFIG,
  ];
