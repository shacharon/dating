/**
 * Dealbreaker rules: which signals are treated as dealbreaker-sensitive when comparing profiles.
 * Uses only existing extraction signal keys; no new keys. No framework decorators.
 *
 * Family / kids: see `kids-family-ownership.ts` — legacy scoring here is separate from HG children admission
 * (`PARTNER_*` dimensions) and from HG-driven list penalties (`children_unsure`).
 */

import type { DerivedContext } from './deriveContext';
import { RELATIONSHIP_CLARITY_MISMATCH_CODE } from './kids-family-ownership';

/** Signal keys that are considered dealbreaker-sensitive (large gaps may be dealbreakers). */
export const DEALBREAKER_SIGNAL_KEYS: readonly string[] = [
  'financialMindset',
  'statusOrientation',
  'traditionalism',
  'spirituality',
  'relationshipClarity',
  'lifestylePace',
] as const;

export type DealbreakerSignalKey = (typeof DEALBREAKER_SIGNAL_KEYS)[number];

/** Default gap threshold above which a dealbreaker signal is considered a potential dealbreaker. */
export const DEALBREAKER_GAP_THRESHOLD = 5;

/**
 * Check if a signal key is dealbreaker-sensitive.
 */
export function isDealbreakerKey(key: string): key is DealbreakerSignalKey {
  return DEALBREAKER_SIGNAL_KEYS.includes(key);
}

/**
 * Result of comparing two signal values for dealbreaker logic.
 */
export interface DealbreakerCheck {
  key: string;
  valueA: number;
  valueB: number;
  gap: number;
  isDealbreaker: boolean;
}

/**
 * Compare two signal maps and return dealbreaker checks for known dealbreaker keys.
 * Only keys present in both maps (non-null) are considered. Uses DEALBREAKER_GAP_THRESHOLD.
 */
export function checkDealbreakers(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
  gapThreshold: number = DEALBREAKER_GAP_THRESHOLD,
): DealbreakerCheck[] {
  const results: DealbreakerCheck[] = [];
  for (const key of DEALBREAKER_SIGNAL_KEYS) {
    const a = signalsA[key];
    const b = signalsB[key];
    if (
      a == null ||
      b == null ||
      typeof a !== 'number' ||
      typeof b !== 'number'
    )
      continue;
    const gap = Math.abs(a - b);
    results.push({
      key,
      valueA: a,
      valueB: b,
      gap,
      isDealbreaker: gap >= gapThreshold,
    });
  }
  return results;
}

/* ── High-level dealbreaker codes (signals + derived context) ───────────────── */

export type DealbreakerCode =
  | typeof RELATIONSHIP_CLARITY_MISMATCH_CODE
  | 'UNPREDICTABILITY_ROUTINE_MISMATCH'
  | 'VISIBILITY_NEED_MISMATCH'
  | 'EMOTIONAL_DEPTH_FLOOR'
  | 'STATUS_GAP_SENSITIVE'
  | 'LIFESTAGE_GAP';

export type Dealbreaker = {
  code: DealbreakerCode;
  /** HARD = true incompatibility (cap). PENALTY = weighted deduction. WARNING = mild deduction. STRONG_FLAG = legacy, treated as PENALTY. */
  severity: 'HARD' | 'STRONG_FLAG' | 'PENALTY' | 'WARNING';
  evidence: string[];
};

/** Points deducted per PENALTY (or legacy STRONG_FLAG). Replaces former cap-at-60. */
export const DEALBREAKER_PENALTY_POINTS = 15;
/** Points deducted per WARNING. */
export const DEALBREAKER_WARNING_POINTS = 5;
/** Cap when any HARD dealbreaker is present (true incompatibility). */
export const DEALBREAKER_HARD_CAP = 45;

export type CoreSignals = Partial<
  Record<
    | 'ambition'
    | 'socialBattery'
    | 'healthBodyConsciousness'
    | 'emotionalDepth'
    | 'attachmentSecurity'
    | 'directness'
    | 'independence'
    | 'traditionalism'
    | 'financialMindset'
    | 'relationshipClarity'
    | 'spirituality'
    | 'lifestylePace'
    | 'physicalPriority'
    | 'statusOrientation',
    number | null
  >
>;

export type DealbreakersInput = {
  a: { signals: CoreSignals; ctx: DerivedContext };
  b: { signals: CoreSignals; ctx: DerivedContext };
  motivationA?:
    | 'family_builder'
    | 'emotional_connection'
    | 'status_power'
    | 'freedom_independence';
  motivationB?:
    | 'family_builder'
    | 'emotional_connection'
    | 'status_power'
    | 'freedom_independence';
};

function n(x: number | null | undefined, fallback = 5): number {
  return typeof x === 'number' ? x : fallback;
}

function diff(
  a: number | null | undefined,
  b: number | null | undefined,
  fallback = 5,
): number {
  return Math.abs(n(a, fallback) - n(b, fallback));
}

export function computeDealbreakers(input: DealbreakersInput): Dealbreaker[] {
  const out: Dealbreaker[] = [];
  const a = input.a;
  const b = input.b;

  const aOcc = a.ctx.occupationClass ?? '';
  const bOcc = b.ctx.occupationClass ?? '';
  const aVisibility = a.ctx.visibilityNeed ?? 5;
  const bVisibility = b.ctx.visibilityNeed ?? 5;
  const aLifeStage = a.ctx.lifeStage ?? 5;
  const bLifeStage = b.ctx.lifeStage ?? 5;

  // 1) Relationship-clarity stress (relationshipClarity only — not HG `PARTNER_WANTS_CHILDREN` / structured kids).
  // High = stronger clarity / commitment-signal axis in V1 space; low = weaker. See `kids-family-ownership.ts`.
  // HARD when one side is clearly high (9–10) and the other clearly low (1–3) with a large gap.
  // Moderate gaps get PENALTY; smaller gaps get WARNING so we don't over-suppress scores.
  // Examples (relationshipClarity 0–10): (9 vs 2) → HARD; (8 vs 3) → PENALTY; (7 vs 4) → WARNING; (6 vs 5) → no flag.
  const aClarity = n(a.signals.relationshipClarity, 5);
  const bClarity = n(b.signals.relationshipClarity, 5);
  const clarityGap = Math.abs(aClarity - bClarity);
  const clarityMin = Math.min(aClarity, bClarity);
  const clarityMax = Math.max(aClarity, bClarity);
  const oneHighClarity = aClarity >= 8 || bClarity >= 8;
  if (clarityGap >= 6 && clarityMin <= 3 && clarityMax >= 9) {
    out.push({
      code: RELATIONSHIP_CLARITY_MISMATCH_CODE,
      severity: 'HARD',
      evidence: [
        `relationshipClarity gap: ${aClarity} vs ${bClarity} (extreme)`,
      ],
    });
  } else if (clarityGap >= 5 && oneHighClarity) {
    out.push({
      code: RELATIONSHIP_CLARITY_MISMATCH_CODE,
      severity: 'PENALTY',
      evidence: [`relationshipClarity gap: ${aClarity} vs ${bClarity}`],
    });
  } else if (clarityGap >= 4 && (aClarity >= 7 || bClarity >= 7)) {
    out.push({
      code: RELATIONSHIP_CLARITY_MISMATCH_CODE,
      severity: 'WARNING',
      evidence: [`relationshipClarity gap: ${aClarity} vs ${bClarity}`],
    });
  }

  // 2) Unpredictability vs routine
  const aUnpredictable =
    aOcc === 'SHIFT_UNPREDICTABLE' || aOcc === 'TRAVEL_HEAVY';
  const bUnpredictable =
    bOcc === 'SHIFT_UNPREDICTABLE' || bOcc === 'TRAVEL_HEAVY';
  const aRoutinePref =
    n(a.signals.lifestylePace, 5) <= 3 && n(a.signals.directness, 5) >= 7;
  const bRoutinePref =
    n(b.signals.lifestylePace, 5) <= 3 && n(b.signals.directness, 5) >= 7;
  if ((aUnpredictable && bRoutinePref) || (bUnpredictable && aRoutinePref)) {
    out.push({
      code: 'UNPREDICTABILITY_ROUTINE_MISMATCH',
      severity: 'STRONG_FLAG',
      evidence: [
        `occupationClass: ${aOcc || '—'} vs ${bOcc || '—'}`,
        `routinePref: A=${aRoutinePref} B=${bRoutinePref}`,
      ],
    });
  }

  // 3) Visibility need mismatch
  if (Math.abs(aVisibility - bVisibility) >= 6) {
    out.push({
      code: 'VISIBILITY_NEED_MISMATCH',
      severity: 'STRONG_FLAG',
      evidence: [`visibilityNeed gap: ${aVisibility} vs ${bVisibility}`],
    });
  }

  // 4) Emotional depth directional mismatch (high vs low — not bilateral low)
  const aDepth = n(a.signals.emotionalDepth, 5);
  const bDepth = n(b.signals.emotionalDepth, 5);
  const emotionalDepthHighVsLow =
    (aDepth >= 8 && bDepth <= 2) || (bDepth >= 8 && aDepth <= 2);
  if (emotionalDepthHighVsLow) {
    out.push({
      code: 'EMOTIONAL_DEPTH_FLOOR',
      severity: 'PENALTY',
      evidence: [`emotionalDepth mismatch: ${aDepth} vs ${bDepth}`],
    });
  }

  // 5) Status gap sensitive (only when at least one is explicitly status-oriented)
  // Business logic: HARD only when one is very status-oriented (9–10) and the other is low (1–3). Otherwise PENALTY or WARNING.
  const aStatus = a.signals.statusOrientation;
  const bStatus = b.signals.statusOrientation;
  const statusGap = diff(aStatus, bStatus, 5);
  const statusMin = Math.min(n(aStatus, 5), n(bStatus, 5));
  const statusMax = Math.max(n(aStatus, 5), n(bStatus, 5));
  const oneStatusHigh =
    (typeof aStatus === 'number' && aStatus >= 8) ||
    (typeof bStatus === 'number' && bStatus >= 8);
  if (oneStatusHigh && statusGap >= 6 && statusMin <= 3 && statusMax >= 9) {
    // HARD: One very status-oriented (9–10), other low (1–3). True incompatibility.
    out.push({
      code: 'STATUS_GAP_SENSITIVE',
      severity: 'HARD',
      evidence: [
        `statusOrientation gap: ${n(aStatus)} vs ${n(bStatus)} (extreme)`,
      ],
    });
  } else if (oneStatusHigh && statusGap >= 4) {
    // PENALTY: One high (8+), gap >= 4; weighted deduction instead of cap.
    out.push({
      code: 'STATUS_GAP_SENSITIVE',
      severity: 'PENALTY',
      evidence: [`statusOrientation gap: ${n(aStatus)} vs ${n(bStatus)}`],
    });
  } else if (
    ((typeof aStatus === 'number' && aStatus >= 7) ||
      (typeof bStatus === 'number' && bStatus >= 7)) &&
    statusGap >= 4
  ) {
    // WARNING: One >= 7, gap >= 4; mild deduction.
    out.push({
      code: 'STATUS_GAP_SENSITIVE',
      severity: 'WARNING',
      evidence: [`statusOrientation gap: ${n(aStatus)} vs ${n(bStatus)}`],
    });
  }

  // 6) Life stage gap
  if (Math.abs(aLifeStage - bLifeStage) >= 4) {
    out.push({
      code: 'LIFESTAGE_GAP',
      severity: 'STRONG_FLAG',
      evidence: [`lifeStage gap: ${aLifeStage} vs ${bLifeStage}`],
    });
  }

  // Optional: motivation mismatch (hard)
  const mA = input.motivationA;
  const mB = input.motivationB;
  const isHardMotivationMismatch =
    (mA === 'status_power' &&
      (mB === 'family_builder' || mB === 'emotional_connection')) ||
    (mB === 'status_power' &&
      (mA === 'family_builder' || mA === 'emotional_connection'));
  if (isHardMotivationMismatch) {
    out.push({
      code: 'VISIBILITY_NEED_MISMATCH',
      severity: 'HARD',
      evidence: [`motivation mismatch: ${mA ?? '—'} vs ${mB ?? '—'}`],
    });
  }

  return out;
}

/**
 * Staged policy: HARD = cap (true incompatibility), PENALTY/WARNING = weighted deduction.
 * - HARD: any HARD dealbreaker → cap at DEALBREAKER_HARD_CAP (45). Preserves only clearly incompatible cases.
 * - STRONG_FLAG (legacy) and PENALTY: deduct DEALBREAKER_PENALTY_POINTS (15) each. Replaces former cap-at-60.
 * - WARNING: deduct DEALBREAKER_WARNING_POINTS (5) each. Mild impact so scores can stay in upper range.
 * Deterministic: order of dealbreakers does not matter; we sum deductions then apply once.
 */
export function applyDealbreakerCap(
  overall: number,
  dealbreakers: Dealbreaker[],
): number {
  const hasHard = dealbreakers.some((d) => d.severity === 'HARD');
  if (hasHard) return Math.min(overall, DEALBREAKER_HARD_CAP);

  const penaltyCount = dealbreakers.filter(
    (d) => d.severity === 'STRONG_FLAG' || d.severity === 'PENALTY',
  ).length;
  const warningCount = dealbreakers.filter(
    (d) => d.severity === 'WARNING',
  ).length;
  const deduction =
    penaltyCount * DEALBREAKER_PENALTY_POINTS +
    warningCount * DEALBREAKER_WARNING_POINTS;
  return Math.max(0, overall - deduction);
}
