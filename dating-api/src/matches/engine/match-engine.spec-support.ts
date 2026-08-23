/** Test support only — excluded from Nest dist via tsconfig.build (same as *.spec-support.ts elsewhere). */

import type { ProfileJsonPayload } from '../../profiles/profiles.types';
import type { SignalKey } from '../../compatibility/compatibility-score';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../compatibility/compatibility-score';

export function makeSignals(overrides: Partial<Record<SignalKey, number>>): Record<string, number> {
  const signals: Record<string, number> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    signals[k] = overrides[k] ?? 5;
  }
  return signals;
}

export function makeProfile(
  id: string,
  name: string,
  signals: Record<string, number>,
  relationshipFitScore = 50,
  evaluationStatus?: ProfileJsonPayload['evaluationStatus'],
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  return {
    id,
    name,
    evaluationStatus,
    texts: { aboutMe: '', aboutPartner: '', aboutRelationship: '' },
    evaluation: {
      self: {
        domain: 'self',
        signals,
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      partner: { domain: 'partner', signals: {}, evidence: [], version: 'v1', confidence: 0.5 },
      relationship: {
        domain: 'relationship',
        signals: {},
        evidence: [],
        version: 'v1',
        confidence: 0.5,
      },
      compatibility: { selfVsPartner: { overallScore: 50 }, selfVsRelationship: { overallScore: 50 } },
      display: { summary: '', insight: '' },
      productScores: {
        partnerFitScore: 50,
        relationshipFitScore,
        coverageScore: 50,
        frictionRiskScore: 0,
        overallDecisionScore: 50,
        policyVersion: 'product-score-v1',
      },
      flags: [],
      enrichment: {
        version: 'v1',
        signals: {
          dailyRhythm: null,
          autonomyTogethernessDepth: null,
          kidsTimeline: null,
          conflictStyleDetail: null,
          relationshipPace: null,
          communicationMode: null,
          interestsTop3,
        },
      },
    },
    savedAt: new Date().toISOString(),
  };
}

type Expansion01ShadowKey = 'empathyCompassion' | 'vulnerabilityOpenness';

export function makeProfileWithShadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion01ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}

type Expansion02ShadowKey = 'emotionalRegulation' | 'physicalAffectionStyle';

export function makeProfileWithExpansion02Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion02ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}

type Expansion03ShadowKey = 'humorPlayfulness';

export function makeProfileWithExpansion03Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion03ShadowKey, number | null>>,
  relationshipFitScore = 50,
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore);
}

type Expansion04ShadowKey = 'intellectualCuriosity' | 'creativeExpression';

export function makeProfileWithExpansion04Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion04ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

type Expansion05ShadowKey = 'physicalActivityLevel' | 'domesticComfort';

export function makeProfileWithExpansion05Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion05ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

type Expansion06ShadowKey = 'adventureNovelty';

export function makeProfileWithExpansion06Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion06ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

type Expansion07ShadowKey =
  | 'casualIntimacyIntent'
  | 'supportExchangeOrientation'
  | 'supportProviderOrientation'
  | 'supportRecipientOrientation'
  | 'religiousObservance';

export function makeProfileWithExpansion07Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion07ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

type Expansion10ShadowKey = 'repairSkills' | 'forgivenessStyle';

export function makeProfileWithExpansion10Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion10ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

type Expansion11ShadowKey = 'stressResponse' | 'jealousySecurity';

export function makeProfileWithExpansion11Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion11ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}


type Expansion12ShadowKey = 'listeningPresence' | 'emotionalExpression';

export function makeProfileWithExpansion12Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion12ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}


type Expansion13ShadowKey = 'growthMindset' | 'selfAwareness';

export function makeProfileWithExpansion13Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion13ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}


type Expansion14ShadowKey =
  | 'patienceTolerance'
  | 'intimacyPacing'
  | 'monogamyAlignment';

export function makeProfileWithExpansion14Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion14ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}

type Expansion15ShadowKey =
  | 'familyEnmeshment'
  | 'friendCoupleBalance'
  | 'aloneTimeNeed';

export function makeProfileWithExpansion15Shadow(
  id: string,
  name: string,
  official: Partial<Record<SignalKey, number>>,
  shadow: Partial<Record<Expansion15ShadowKey, number | null>>,
  relationshipFitScore = 50,
  interestsTop3: string[] = [],
): ProfileJsonPayload {
  const signals = {
    ...makeSignals(official),
    ...shadow,
  } as Record<string, number>;
  return makeProfile(id, name, signals, relationshipFitScore, undefined, interestsTop3);
}
