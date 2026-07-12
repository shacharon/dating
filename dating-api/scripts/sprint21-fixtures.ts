/**
 * Sprint 21 fixture builders — shared by seed + verify scripts.
 * Deterministic EvaluateBatchResult-shaped payloads for field inspection.
 */

import { COMPATIBILITY_SIGNAL_KEYS } from '../src/compatibility/compatibility-score';
import type { EvaluateBatchResult } from '../src/evaluate/evaluate-batch.types';
import type { ProfileJsonPayload } from '../src/profiles/profiles.types';

export type Sprint21PairId =
  | 'conflict_same'
  | 'interests_overlap'
  | 'control';

const BASE_SIGNAL = 6;

function makeSignals(
  overrides: Record<string, number | null>,
): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    out[k] = overrides[k] !== undefined ? overrides[k] : BASE_SIGNAL;
  }
  return out;
}

function makeDomain(
  domain: 'self' | 'partner' | 'relationship',
  signals: Record<string, number | null>,
) {
  return {
    domain,
    signals,
    evidence: [] as [],
    version: 'v1' as const,
    confidence: 0.85,
    domainStatus: 'OK' as const,
  };
}

function emptyCompat() {
  return {
    overallScore: 70,
    coverage: 1,
    matchedSignals: COMPATIBILITY_SIGNAL_KEYS.length,
    hardMismatches: [],
    breakdown: [],
  };
}

function productScores(relationshipFitScore: number) {
  return {
    partnerFitScore: 70,
    relationshipFitScore,
    coverageScore: 80,
    frictionRiskScore: 10,
    overallDecisionScore: 70,
    policyVersion: 'product-score-v1' as const,
  };
}

function makeEval(opts: {
  selfOverrides: Record<string, number | null>;
  interestsTop3: string[];
  relationshipFitScore?: number;
}): EvaluateBatchResult {
  const selfSignals = makeSignals(opts.selfOverrides);
  const partnerSignals = makeSignals({});
  const relationshipSignals = makeSignals({});
  return {
    self: makeDomain('self', selfSignals),
    partner: makeDomain('partner', partnerSignals),
    relationship: makeDomain('relationship', relationshipSignals),
    compatibility: {
      selfVsPartner: emptyCompat(),
      selfVsRelationship: emptyCompat(),
    },
    display: {
      overallNarrative: 'Sprint 21 fixture',
      aboutMeInsight: 'Sprint 21 fixture',
      relationshipInsight: 'Sprint 21 fixture',
      partnerInsight: 'Sprint 21 fixture',
      missingPrompts: [],
      summary: 'Sprint 21 fixture',
      insight: 'Sprint 21 fixture',
    },
    productScores: productScores(opts.relationshipFitScore ?? 65),
    productScoresPresentation: {
      partnerFitScore: { kind: 'numeric', value: 70 },
      relationshipFitScore: {
        kind: 'numeric',
        value: opts.relationshipFitScore ?? 65,
      },
      coverageScore: { kind: 'numeric', value: 80 },
      frictionRiskScore: { kind: 'numeric', value: 10 },
      overallDecisionScore: { kind: 'numeric', value: 70 },
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
        interestsTop3: opts.interestsTop3,
      },
    },
  };
}

function makeProfile(
  id: string,
  name: string,
  evaluation: EvaluateBatchResult,
): ProfileJsonPayload {
  return {
    id,
    name,
    texts: {
      aboutMe: `${name} about me`,
      aboutPartner: `${name} about partner`,
      aboutRelationship: `${name} about relationship`,
    },
    evaluation,
    savedAt: new Date().toISOString(),
    evaluationStatus: 'DONE',
  };
}

export interface Sprint21PairFixture {
  id: Sprint21PairId;
  label: string;
  expect: {
    interestAlignmentMin?: number;
    interestAlignmentMax?: number;
    sharedInterestNotePresent: boolean;
    conflictStyleOnBoth: boolean;
  };
  a: ProfileJsonPayload;
  b: ProfileJsonPayload;
  /** Tags for UserProfileInterest dual-write (A / B). */
  interestsA: string[];
  interestsB: string[];
  conflictStyleA: number | null;
  conflictStyleB: number | null;
}

export const SPRINT21_PAIRS: Sprint21PairFixture[] = [
  {
    id: 'conflict_same',
    label: 'Both conflictStyle=8, no interests',
    expect: {
      interestAlignmentMax: 0,
      sharedInterestNotePresent: false,
      conflictStyleOnBoth: true,
    },
    interestsA: [],
    interestsB: [],
    conflictStyleA: 8,
    conflictStyleB: 8,
    a: makeProfile(
      's21_conflict_a',
      'S21 Conflict A',
      makeEval({
        selfOverrides: { conflictStyle: 8 },
        interestsTop3: [],
      }),
    ),
    b: makeProfile(
      's21_conflict_b',
      'S21 Conflict B',
      makeEval({
        selfOverrides: { conflictStyle: 8 },
        interestsTop3: [],
      }),
    ),
  },
  {
    id: 'interests_overlap',
    label: 'Shared hiking+books, conflictStyle null',
    expect: {
      // |{hiking,books}| / |{hiking,books,cooking,gym}| = 2/4 → 50
      interestAlignmentMin: 50,
      interestAlignmentMax: 50,
      sharedInterestNotePresent: true,
      conflictStyleOnBoth: false,
    },
    interestsA: ['hiking', 'books', 'cooking'],
    interestsB: ['hiking', 'books', 'gym'],
    conflictStyleA: null,
    conflictStyleB: null,
    a: makeProfile(
      's21_interests_a',
      'S21 Interests A',
      makeEval({
        selfOverrides: { conflictStyle: null },
        interestsTop3: ['hiking', 'books', 'cooking'],
      }),
    ),
    b: makeProfile(
      's21_interests_b',
      'S21 Interests B',
      makeEval({
        selfOverrides: { conflictStyle: null },
        interestsTop3: ['hiking', 'books', 'gym'],
      }),
    ),
  },
  {
    id: 'control',
    label: 'No conflictStyle, no interests',
    expect: {
      interestAlignmentMax: 0,
      sharedInterestNotePresent: false,
      conflictStyleOnBoth: false,
    },
    interestsA: [],
    interestsB: [],
    conflictStyleA: null,
    conflictStyleB: null,
    a: makeProfile(
      's21_control_a',
      'S21 Control A',
      makeEval({
        selfOverrides: { conflictStyle: null },
        interestsTop3: [],
      }),
    ),
    b: makeProfile(
      's21_control_b',
      'S21 Control B',
      makeEval({
        selfOverrides: { conflictStyle: null },
        interestsTop3: [],
      }),
    ),
  },
];

/** Stable IDs for DB seed (user + profile). */
export function seedIdsForProfile(profileId: string): {
  userId: string;
  profileId: string;
  email: string;
} {
  return {
    userId: `user_${profileId}`,
    profileId,
    email: `${profileId}@sprint21.seed.local`,
  };
}
