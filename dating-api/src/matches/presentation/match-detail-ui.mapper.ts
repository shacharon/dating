/**
 * Maps stored match records to the dating-ui detail contract.
 * No scoring changes — only field selection and deterministic string assembly.
 */

import { tryPickHolyGrailMatchDiagnosticsDto } from '../holy-grail/holy-grail-match-diagnostics.wire';
import { buildShortReason } from './match-short-reason';
import type {
  ChildrenUnsureDirectionsDto,
  MatchRecordDto,
} from '../match.types';
import { resolveEngineFinalScore } from '../engine/match-score.util';

/** Detail UI HG triple — local structural type so ESLint/TS never sees a broken re-exported symbol. */
type HolyGrailDetailSlice = Readonly<{
  hgMutualPass: boolean;
  hgOverallStatus: string;
  hgRankScore: number;
}>;

/** Same as wire `HolyGrailMatchDiagnosticsPickSource`; derived from `tryPick` so the type import is not a separate graph edge (avoids ESLint `error` phantom on the alias). */
type HolyGrailDiagnosticsWireInput = Parameters<
  typeof tryPickHolyGrailMatchDiagnosticsDto
>[0];

function pickHolyGrailDetailSlice(
  source: HolyGrailDiagnosticsWireInput,
): HolyGrailDetailSlice | undefined {
  // Bridge: `tryPick` return type can resolve as an ESLint `error` symbol in some graphs; narrow from `unknown`.
  const raw = tryPickHolyGrailMatchDiagnosticsDto(source) as unknown;
  if (raw == null || typeof raw !== 'object') {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.hgMutualPass !== 'boolean') {
    return undefined;
  }
  if (typeof o.hgOverallStatus !== 'string') {
    return undefined;
  }
  if (typeof o.hgRankScore !== 'number' || !Number.isFinite(o.hgRankScore)) {
    return undefined;
  }
  return {
    hgMutualPass: o.hgMutualPass,
    hgOverallStatus: o.hgOverallStatus,
    hgRankScore: o.hgRankScore,
  };
}

/** @inline — same shape as list/detail `children_unsure`. */
export type MatchDetailChildrenUnsureDto = ChildrenUnsureDirectionsDto;

/** Response body for GET /api/v1/matches/:id (dating-ui). */
export interface MatchDetailUiDto {
  ok: true;
  id: string;
  /** Legacy: same as profileB.name for older clients. */
  name: string;
  profileA: { id: string; name: string };
  profileB: { id: string; name: string };
  /**
   * When either side has MUST_WANT children and the other answered UNSURE (SOFT_PASS).
   * Stored scores unchanged. Production list order is legacy-only (`MATCH_RANKING_CONTRACT === HG_GATE_LEGACY_RANK_V1`);
   * this flag drives badges and optional `hideChildrenUnsure` filtering only — not sort position.
   */
  children_unsure: MatchDetailChildrenUnsureDto;
  score: number;
  /** Match pipeline confidence (0–1) when present on the stored record. */
  confidence?: number;
  /** Explainability one-liner when present on the record. */
  reasonShort?: string;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
  chips: string[];
  /** Raw tension label from explainability when present. */
  tensionChip?: string;
  expandedExplainability: string[];
  /**
   * Read-only HG diagnostics (full triple only). Omitted when enrichment unavailable or wire-invalid.
   * Legacy clients ignore; same keys as list `MatchListItemDto`.
   */
  readonly hgMutualPass?: boolean;
  readonly hgOverallStatus?: string;
  readonly hgRankScore?: number;
}

function effectiveExplainability(m: MatchRecordDto) {
  return m.recommendation?.explainability ?? m.explainability;
}

/**
 * Up to 5 short lines for "Why this works", from existing explainability / shortReason only.
 */
function buildExpandedExplainability(m: MatchRecordDto): string[] {
  const expl = effectiveExplainability(m);
  const out: string[] = [];

  if (expl?.positiveChips?.length) {
    for (const c of expl.positiveChips.slice(0, 5)) {
      out.push(c);
    }
  }

  if (out.length < 2 && expl?.reasonShort) {
    const parts = expl.reasonShort
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      if (out.length >= 5) break;
      const line = p.endsWith('.') ? p : `${p}.`;
      if (!out.includes(line)) out.push(line);
    }
  }

  if (out.length < 2) {
    const finalScore = resolveEngineFinalScore(m);
    const sr = buildShortReason({
      finalScore,
      dealbreakers: m.dealbreakers ?? [],
    });
    if (!out.includes(sr)) out.push(sr);
  }

  if (out.length < 2 && expl?.tensionChip) {
    const line = `Main tension to navigate: ${expl.tensionChip}.`;
    if (!out.includes(line)) out.push(line);
  }

  return out.slice(0, 5);
}

export function mapMatchRecordToDetailUi(
  m: MatchRecordDto,
  childrenUnsure: MatchDetailChildrenUnsureDto,
  holyGrail?: HolyGrailDiagnosticsWireInput,
): MatchDetailUiDto {
  const expl = effectiveExplainability(m);
  const rec = m.recommendation;
  const finalScore = resolveEngineFinalScore(m);

  const primaryTakeaway =
    rec?.primaryTakeaway ??
    expl?.reasonShort ??
    buildShortReason({ finalScore, dealbreakers: m.dealbreakers ?? [] });

  const tension = expl?.tensionChip?.trim();
  const caution =
    rec?.caution?.trim() || (tension ? `Watch for ${tension}.` : undefined);

  const suggestedNextAction =
    rec?.suggestedNextAction?.trim() ||
    'Start a conversation when it feels right.';

  const chips = (expl?.positiveChips ?? []).slice(0, 5);
  const reasonShortRaw = expl?.reasonShort?.trim();
  const tensionChipRaw = expl?.tensionChip?.trim();
  const hgWire: HolyGrailDetailSlice | undefined =
    pickHolyGrailDetailSlice(holyGrail);

  const hgDetailFields: Pick<
    MatchDetailUiDto,
    'hgMutualPass' | 'hgOverallStatus' | 'hgRankScore'
  > | null = hgWire
    ? {
        hgMutualPass: hgWire.hgMutualPass,
        hgOverallStatus: hgWire.hgOverallStatus,
        hgRankScore: hgWire.hgRankScore,
      }
    : null;

  return {
    ok: true,
    id: m.matchId,
    name: m.b.name,
    profileA: { id: m.a.id, name: m.a.name },
    profileB: { id: m.b.id, name: m.b.name },
    children_unsure: childrenUnsure,
    score: Math.round(finalScore),
    ...(m.confidence != null && Number.isFinite(m.confidence)
      ? { confidence: m.confidence }
      : {}),
    ...(reasonShortRaw ? { reasonShort: reasonShortRaw } : {}),
    primaryTakeaway,
    ...(caution ? { caution } : {}),
    suggestedNextAction,
    chips,
    ...(tensionChipRaw ? { tensionChip: tensionChipRaw } : {}),
    expandedExplainability: buildExpandedExplainability(m),
    ...(hgDetailFields ?? {}),
  };
}
