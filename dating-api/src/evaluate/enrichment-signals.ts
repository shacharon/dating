/**
 * evaluation.enrichment.signals — additive sidecar only.
 * Deterministic extraction from profile text; does not touch core signals or scoring.
 * Mapping is ENRICHMENT_V4 (closed snake_case codes); version remains v1 for API compatibility.
 */

import {
  sanitizeEnrichmentCoreScalars,
  type EnrichmentAutonomyTogethernessLabel,
  type EnrichmentConflictStyleDetailLabel,
  type EnrichmentDailyRhythmLabel,
  type EnrichmentKidsTimelineLabel,
} from './enrichment-canonical-labels';
import { buildEnrichmentSignalsV4 } from './enrichment-v4';

export interface EnrichmentSignalsV1 {
  /** Sleep / routine / pace-of-day cues (explicit or clearly implied). */
  dailyRhythm: EnrichmentDailyRhythmLabel | null;
  /** Togetherness vs independence balance (explicit or clearly implied). */
  autonomyTogethernessDepth: EnrichmentAutonomyTogethernessLabel | null;
  /** Children intent / timeline (explicit or clearly implied). */
  kidsTimeline: EnrichmentKidsTimelineLabel | null;
  /** How they handle disagreement (explicit or clearly implied). */
  conflictStyleDetail: EnrichmentConflictStyleDetailLabel | null;
  /** Up to three distinct interest labels, first-seen order in combined text. */
  interestsTop3: string[];
}

export interface EnrichmentV1 {
  version: 'v1';
  signals: EnrichmentSignalsV1;
}

/** Raw mapper output before canonical coercion (e.g. rule `string` inference). */
export type EnrichmentSignalsV1Input = {
  dailyRhythm?: string | null;
  autonomyTogethernessDepth?: string | null;
  kidsTimeline?: string | null;
  conflictStyleDetail?: string | null;
  interestsTop3?: unknown;
};

export const ENRICHMENT_CORE_SCALAR_FIELDS = [
  'dailyRhythm',
  'autonomyTogethernessDepth',
  'kidsTimeline',
  'conflictStyleDetail',
] as const;

export type EnrichmentCoreScalarField =
  (typeof ENRICHMENT_CORE_SCALAR_FIELDS)[number];

export type EnrichmentScalarDroppedEvent = {
  profileId: string | null;
  field: EnrichmentCoreScalarField;
  rawValue: string;
  action: 'dropped';
};

/**
 * Coerce the four core scalar fields to closed canonical labels (or null). Safe for DB/API payloads.
 */
export function sanitizeEnrichmentSignalsV1(
  signals: EnrichmentSignalsV1Input,
): EnrichmentSignalsV1 {
  const core = sanitizeEnrichmentCoreScalars({
    dailyRhythm: signals.dailyRhythm,
    autonomyTogethernessDepth: signals.autonomyTogethernessDepth,
    kidsTimeline: signals.kidsTimeline,
    conflictStyleDetail: signals.conflictStyleDetail,
  });
  const interestsTop3 = Array.isArray(signals.interestsTop3)
    ? signals.interestsTop3.filter((x): x is string => typeof x === 'string')
    : [];
  return { ...core, interestsTop3 };
}

/**
 * Same as {@link sanitizeEnrichmentSignalsV1}; optionally emit one event per core field where a
 * non-empty raw string became null (not in allowed enum after coercion).
 */
export function sanitizeEnrichmentSignalsV1ForPersist(
  signals: EnrichmentSignalsV1Input,
  opts?: {
    profileId?: string | null;
    onDropped?: (e: EnrichmentScalarDroppedEvent) => void;
  },
): EnrichmentSignalsV1 {
  const after = sanitizeEnrichmentSignalsV1(signals);
  const onDropped = opts?.onDropped;
  if (onDropped) {
    const profileId = opts.profileId ?? null;
    for (const field of ENRICHMENT_CORE_SCALAR_FIELDS) {
      const raw = signals[field];
      if (
        typeof raw === 'string' &&
        raw.trim() !== '' &&
        after[field] === null
      ) {
        onDropped({ profileId, field, rawValue: raw, action: 'dropped' });
      }
    }
  }
  return after;
}

/**
 * Build enrichment.signals from the three profile text blocks.
 * Only fills fields when language is explicit or strongly implied by V2 rules.
 */
export function buildEnrichmentSignals(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): EnrichmentSignalsV1 {
  const raw = buildEnrichmentSignalsV4(
    aboutMe,
    aboutPartner,
    aboutRelationship,
  );
  return sanitizeEnrichmentSignalsV1(raw);
}

export function wrapEnrichmentV1(signals: EnrichmentSignalsV1): EnrichmentV1 {
  return { version: 'v1', signals };
}
