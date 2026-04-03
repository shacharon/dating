/** Match record used by API responses and in-memory indexing. */

import type { CompareResultDto, MatchDebugDto } from './match-engine';

export interface MatchRecordDto {
  matchId: string;
  aId: string;
  bId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  /** @deprecated Use finalScore instead. Kept for backward compatibility. */
  overall: number;
  createdAt: string;
  updatedAt: string;
  aToB: number;
  bToA: number;
  relationshipStyle: number;
  coverage: number;
  frictionRisk: number;
  compatibility?: number;
  finalScore?: number;
  /** Raw score before clamp (from engine). */
  rawScore?: number;
  friction?: number;
  frictionPenalty?: number;
  coveragePercent?: number;
  scoreCoverageFactor?: number;
  confidence?: number;
  infoFlags?: CompareResultDto['infoFlags'];
  coverageFactor?: number;
  alignments: CompareResultDto['alignments'];
  tensions: CompareResultDto['tensions'];
  tensionMatrix?: CompareResultDto['tensionMatrix'];
  /** Set when recomputed (e.g. "v2") to mark policy version. */
  policyVersion?: string;
  /** Derived context and dealbreaker/balance layers (additive). */
  derived?: CompareResultDto['derived'];
  dealbreakers?: CompareResultDto['dealbreakers'];
  balance?: CompareResultDto['balance'];
  /** Debug audit: baseScore, coverage, penalties, bonuses, finalScore breakdown. */
  debug?: MatchDebugDto;
  /** Deterministic chips + short reason (omitted on older stored records). */
  explainability?: CompareResultDto['explainability'];
  /** User-facing recommendation layer (omitted on older stored records). */
  recommendation?: CompareResultDto['recommendation'];
}

export interface MatchListItemDto {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  /** @deprecated Use finalScore instead. */
  overall: number;
  finalScore?: number;
  updatedAt: string;
  /** Balance tier (GREEN / YELLOW / RED) for observability. */
  tier: string | null;
  /** Dealbreakers applied to this match. */
  dealbreakers: Array<{ code: string; severity?: string }>;
  /** Deterministic one-line reason from score/dealbreakers. */
  shortReason: string;
  /** Engine explainability (omitted on older records). */
  explainability?: CompareResultDto['explainability'];
  /** User-facing recommendation layer (omitted on older records). */
  recommendation?: CompareResultDto['recommendation'];
  /** Optional score breakdown for observability. */
  scoreMetadata?: {
    coveragePercent?: number;
    coverageFactor?: number;
    friction?: number;
    rawScore?: number;
  };
}

/** In-memory index entry (auto-generated on rebuild). */
export interface MatchIndexWhyTopEntry {
  key: string;
  text: string;
  direction: string;
}

export interface MatchIndexTensionsTopEntry {
  key: string;
  text: string;
  gap: number;
  direction: string;
}

export interface MatchIndexItemDto {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  /** @deprecated Use finalScore instead. */
  overall: number;
  finalScore?: number;
  coverage: number;
  frictionRisk: number;
  coveragePercent?: number;
  scoreCoverageFactor?: number;
  confidence?: number;
  infoFlags?: CompareResultDto['infoFlags'];
  coverageFactor?: number;
  friction?: number;
  compatibility?: number;
  rawScore?: number;
  whyTop: MatchIndexWhyTopEntry[];
  tensionsTop: MatchIndexTensionsTopEntry[];
  tensionMatrix?: Array<{ id: string; name: string; penalty: number; explain: string }>;
  updatedAt: string;
  /** Same slice as list/detail when index is rebuilt from records. */
  explainability?: CompareResultDto['explainability'];
  /** User-facing recommendation layer (omitted on older records). */
  recommendation?: CompareResultDto['recommendation'];
}

export interface MatchIndexDto {
  generatedAt: string;
  profileCount: number;
  matchCount: number;
  items: MatchIndexItemDto[];
}
