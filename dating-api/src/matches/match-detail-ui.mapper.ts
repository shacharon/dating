/**
 * Maps stored match records to the dating-ui detail contract.
 * No scoring changes — only field selection and deterministic string assembly.
 */

import type { MatchRecordDto } from './match.types';
import { buildShortReason } from './match-short-reason';

/** Per-direction: profile A as searcher vs B as counterparty (Holy Grail internal). */
export interface MatchDetailChildrenUnsureDto {
  readonly profile_a_to_profile_b: boolean;
  readonly profile_b_to_profile_a: boolean;
}

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
   * Does not affect stored scores or list ordering.
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
}

function effectiveExplainability(m: MatchRecordDto) {
  return m.recommendation?.explainability ?? m.explainability;
}

/**
 * 2–3 short lines for "Why this works", from existing explainability / shortReason only.
 */
function buildExpandedExplainability(m: MatchRecordDto): string[] {
  const expl = effectiveExplainability(m);
  const out: string[] = [];

  if (expl?.positiveChips?.length) {
    for (const c of expl.positiveChips.slice(0, 3)) {
      out.push(c);
    }
  }

  if (out.length < 2 && expl?.reasonShort) {
    const parts = expl.reasonShort
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const p of parts) {
      if (out.length >= 3) break;
      const line = p.endsWith('.') ? p : `${p}.`;
      if (!out.includes(line)) out.push(line);
    }
  }

  if (out.length < 2) {
    const finalScore = m.finalScore ?? m.overall;
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

  return out.slice(0, 3);
}

export function mapMatchRecordToDetailUi(
  m: MatchRecordDto,
  childrenUnsure: MatchDetailChildrenUnsureDto,
): MatchDetailUiDto {
  const expl = effectiveExplainability(m);
  const rec = m.recommendation;
  const finalScore = m.finalScore ?? m.overall;

  const primaryTakeaway =
    rec?.primaryTakeaway ??
    expl?.reasonShort ??
    buildShortReason({ finalScore, dealbreakers: m.dealbreakers ?? [] });

  const tension = expl?.tensionChip?.trim();
  const caution =
    rec?.caution?.trim() ||
    (tension ? `Watch for ${tension}.` : undefined);

  const suggestedNextAction =
    rec?.suggestedNextAction?.trim() || 'Start a conversation when it feels right.';

  const chips = (expl?.positiveChips ?? []).slice(0, 5);
  const reasonShortRaw = expl?.reasonShort?.trim();
  const tensionChipRaw = expl?.tensionChip?.trim();

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
  };
}
