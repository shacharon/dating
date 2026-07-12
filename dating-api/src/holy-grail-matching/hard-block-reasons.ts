/**
 * Sprint 18 Story 1 — map HG hard FAIL dimensions to viewer-facing hard-block reasons.
 * Pure / DI-free. Soft ranking out of scope.
 */

import type { HolyGrailDirectionalEvaluationResult } from './eligibility.evaluator';
import { HOLY_GRAIL_DIMENSION_KEYS } from './holy-grail-dimensions';
import type {
  DealbreakerSignal,
  SelfFactHint,
} from './dealbreaker-signals-text.extract';

export type HardBlockDirection = 'viewer_to_them' | 'them_to_viewer';

export type HardBlockReasonDto = {
  code: string;
  dimension: string;
  direction: HardBlockDirection;
  message: string;
  evidence?: {
    viewerQuote?: string;
    counterpartyQuote?: string;
  };
};

export type HardBlockedDto = {
  disabled: true;
  reasons: HardBlockReasonDto[];
};

/** True when the viewer already has a durable relationship with this candidate. */
export function isExistingHardBlockCandidate(input: {
  yourAction: 'LIKE' | 'PASS' | 'BLOCK' | null;
  hasActiveMutual: boolean;
}): boolean {
  return input.yourAction === 'LIKE' || input.hasActiveMutual;
}

/**
 * Map SelfFactHint fields to dealbreaker dimension tags used in eligibility.
 * Mirrors {@link selfFactHintsToPolarityMap} tag targets.
 */
function tagsForSelfFactField(field: string): readonly string[] {
  switch (field) {
    case 'smokingFrequency':
      return ['smoking', 'only_non_smokers', 'only_smokers'];
    case 'alcoholUse':
      return ['excessive_drinking', 'only_non_drinkers'];
    case 'wantsChildren':
      return ['kids_required'];
    case 'childrenStatus':
      return ['no_kids'];
    default:
      return [];
  }
}

function selfHintEvidenceForTag(
  hints: readonly SelfFactHint[],
  tag: string,
): string | undefined {
  for (const h of hints) {
    if (tagsForSelfFactField(h.field).includes(tag)) {
      return h.evidence;
    }
  }
  return undefined;
}

function signalEvidenceForTag(
  signals: readonly DealbreakerSignal[],
  tag: string,
): string | undefined {
  const hit = signals.find((s) => s.tag === tag);
  return hit?.evidence;
}

function quoteEvidence(args: {
  direction: HardBlockDirection;
  tag: string;
  viewerSignals: readonly DealbreakerSignal[];
  counterpartySignals: readonly DealbreakerSignal[];
  viewerSelfHints: readonly SelfFactHint[];
  counterpartySelfHints: readonly SelfFactHint[];
}): HardBlockReasonDto['evidence'] | undefined {
  let viewerQuote: string | undefined;
  let counterpartyQuote: string | undefined;

  if (args.direction === 'viewer_to_them') {
    viewerQuote = signalEvidenceForTag(args.viewerSignals, args.tag);
    counterpartyQuote = selfHintEvidenceForTag(
      args.counterpartySelfHints,
      args.tag,
    );
  } else {
    // them_to_viewer: their preference vs our self-fact
    counterpartyQuote = signalEvidenceForTag(args.counterpartySignals, args.tag);
    viewerQuote = selfHintEvidenceForTag(args.viewerSelfHints, args.tag);
  }

  if (viewerQuote === undefined && counterpartyQuote === undefined) {
    return undefined;
  }
  return {
    ...(viewerQuote !== undefined ? { viewerQuote } : {}),
    ...(counterpartyQuote !== undefined ? { counterpartyQuote } : {}),
  };
}

function dealbreakerMessage(
  direction: HardBlockDirection,
  evidence: HardBlockReasonDto['evidence'] | undefined,
): string {
  const vq = evidence?.viewerQuote;
  const cq = evidence?.counterpartyQuote;
  if (direction === 'viewer_to_them') {
    if (vq && cq) {
      return `Your preference (“${vq}”) conflicts with their profile (“${cq}”).`;
    }
    if (vq) {
      return `Your preference (“${vq}”) conflicts with their profile.`;
    }
    if (cq) {
      return `Your preferences conflict with their profile (“${cq}”).`;
    }
    return 'Your preferences conflict with their profile.';
  }
  if (cq && vq) {
    return `Their preference (“${cq}”) conflicts with your profile (“${vq}”).`;
  }
  if (cq) {
    return `Their preference (“${cq}”) conflicts with your profile.`;
  }
  if (vq) {
    return `Their preferences conflict with your profile (“${vq}”).`;
  }
  return 'Their preferences conflict with your profile.';
}

function fixedDimensionMessage(
  code: string,
  direction: HardBlockDirection,
): string {
  switch (code) {
    case 'GENDER_NOT_IN_ALLOWLIST':
      return direction === 'viewer_to_them'
        ? 'Their gender is outside your partner gender preferences.'
        : 'Your gender is outside their partner gender preferences.';
    case 'AGE_OUTSIDE_RANGE':
    case 'AGE_BELOW_MIN':
    case 'AGE_ABOVE_MAX':
      return direction === 'viewer_to_them'
        ? 'Their age is outside your preferred age range.'
        : 'Your age is outside their preferred age range.';
    case 'PROXIMITY_TOO_FAR':
      return direction === 'viewer_to_them'
        ? 'They are outside your preferred distance.'
        : 'You are outside their preferred distance.';
    default:
      return direction === 'viewer_to_them'
        ? `Hard preference not met (${code}).`
        : `Their hard preference not met (${code}).`;
  }
}

function pushUnique(
  out: HardBlockReasonDto[],
  seen: Set<string>,
  reason: HardBlockReasonDto,
): void {
  const key = `${reason.direction}|${reason.dimension}|${reason.code}`;
  if (seen.has(key)) return;
  seen.add(key);
  out.push(reason);
}

function collectFromDirection(args: {
  evaluation: HolyGrailDirectionalEvaluationResult;
  direction: HardBlockDirection;
  viewerSignals: readonly DealbreakerSignal[];
  counterpartySignals: readonly DealbreakerSignal[];
  viewerSelfHints: readonly SelfFactHint[];
  counterpartySelfHints: readonly SelfFactHint[];
  out: HardBlockReasonDto[];
  seen: Set<string>;
}): void {
  for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
    const ev = args.evaluation.dimensions[dim];
    if (ev.status !== 'FAIL') continue;
    pushUnique(args.out, args.seen, {
      code: ev.reasonCode,
      dimension: dim,
      direction: args.direction,
      message: fixedDimensionMessage(ev.reasonCode, args.direction),
    });
  }

  for (const [tag, ev] of Object.entries(args.evaluation.dealbreakerDimensions)) {
    if (ev.status !== 'FAIL') continue;
    const evidence = quoteEvidence({
      direction: args.direction,
      tag,
      viewerSignals: args.viewerSignals,
      counterpartySignals: args.counterpartySignals,
      viewerSelfHints: args.viewerSelfHints,
      counterpartySelfHints: args.counterpartySelfHints,
    });
    pushUnique(args.out, args.seen, {
      code: ev.reasonCode,
      dimension: tag,
      direction: args.direction,
      message: dealbreakerMessage(args.direction, evidence),
      ...(evidence !== undefined ? { evidence } : {}),
    });
  }
}

/**
 * Build 1..n hard-block reasons from both directional evaluations.
 * Caller should only invoke when overall hard FAIL in either direction.
 *
 * Evidence inputs are bidirectional so `them_to_viewer` can quote their preference
 * and our self-fact (architect signature extended for reciprocal quotes).
 */
export function buildHardBlockReasons(input: {
  aToB: HolyGrailDirectionalEvaluationResult;
  bToA: HolyGrailDirectionalEvaluationResult;
  viewerSignals: readonly DealbreakerSignal[];
  counterpartySignals?: readonly DealbreakerSignal[];
  viewerSelfHints?: readonly SelfFactHint[];
  counterpartySelfHints: readonly SelfFactHint[];
}): HardBlockReasonDto[] {
  const out: HardBlockReasonDto[] = [];
  const seen = new Set<string>();
  const counterpartySignals = input.counterpartySignals ?? [];
  const viewerSelfHints = input.viewerSelfHints ?? [];

  collectFromDirection({
    evaluation: input.aToB,
    direction: 'viewer_to_them',
    viewerSignals: input.viewerSignals,
    counterpartySignals,
    viewerSelfHints,
    counterpartySelfHints: input.counterpartySelfHints,
    out,
    seen,
  });
  collectFromDirection({
    evaluation: input.bToA,
    direction: 'them_to_viewer',
    viewerSignals: input.viewerSignals,
    counterpartySignals,
    viewerSelfHints,
    counterpartySelfHints: input.counterpartySelfHints,
    out,
    seen,
  });

  return out;
}

export function toHardBlockedDto(
  reasons: HardBlockReasonDto[],
): HardBlockedDto | undefined {
  if (reasons.length === 0) return undefined;
  return { disabled: true, reasons };
}
