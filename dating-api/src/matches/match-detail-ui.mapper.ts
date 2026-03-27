/**
 * Maps stored match records to the dating-ui detail contract.
 * No scoring changes — only field selection and deterministic string assembly.
 */

import type { MatchRecordDto } from './match.types';
import { buildShortReason } from './match-short-reason';

/** Response body for GET /api/v1/matches/:id (dating-ui). */
export interface MatchDetailUiDto {
  ok: true;
  id: string;
  name: string;
  primaryTakeaway: string;
  caution?: string;
  suggestedNextAction: string;
  chips: string[];
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
    const tier = m.balance?.tier ?? m.debug?.tier ?? 'UNKNOWN';
    const finalScore = m.finalScore ?? m.overall;
    const sr = buildShortReason({
      finalScore,
      tier,
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

export function mapMatchRecordToDetailUi(m: MatchRecordDto): MatchDetailUiDto {
  const expl = effectiveExplainability(m);
  const rec = m.recommendation;
  const finalScore = m.finalScore ?? m.overall;
  const tier = m.balance?.tier ?? m.debug?.tier ?? 'UNKNOWN';

  const primaryTakeaway =
    rec?.primaryTakeaway ??
    expl?.reasonShort ??
    buildShortReason({ finalScore, tier, dealbreakers: m.dealbreakers ?? [] });

  const tension = expl?.tensionChip?.trim();
  const caution =
    rec?.caution?.trim() ||
    (tension ? `Watch for ${tension}.` : undefined);

  const suggestedNextAction =
    rec?.suggestedNextAction?.trim() || 'Start a conversation when it feels right.';

  const chips = (expl?.positiveChips ?? []).slice(0, 5);

  return {
    ok: true,
    id: m.matchId,
    name: m.b.name,
    primaryTakeaway,
    ...(caution ? { caution } : {}),
    suggestedNextAction,
    chips,
    expandedExplainability: buildExpandedExplainability(m),
  };
}
