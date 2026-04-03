/**
 * Maps GET /api/v1/matches list items to generic match cards (no scoring logic).
 */

export interface MatchListItemApi {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  overall: number;
  finalScore?: number;
  updatedAt: string;
  tier: string | null;
  dealbreakers: Array<{ code: string; severity?: string }>;
  shortReason: string;
  explainability?: {
    positiveChips: string[];
    tensionChip?: string;
    reasonShort: string;
  };
  recommendation?: {
    explainability: {
      positiveChips: string[];
      tensionChip?: string;
      reasonShort: string;
    };
    primaryTakeaway: string;
    caution?: string;
    suggestedNextAction: string;
  };
}

export interface GenericMatchCardModel {
  id: string;
  /** Both profile names from the list row (MatchListItemDto a/b). */
  pairLabel: string;
  score: number;
  reasonShort: string;
  chips: string[];
  primaryTakeaway: string;
}

function effectiveExplainability(item: MatchListItemApi) {
  return item.recommendation?.explainability ?? item.explainability;
}

export function mapListItemToCard(item: MatchListItemApi): GenericMatchCardModel {
  const expl = effectiveExplainability(item);
  const score = Math.round(item.finalScore ?? item.overall);
  const reasonShort =
    expl?.reasonShort?.trim() || item.shortReason?.trim() || '';
  const chips = (expl?.positiveChips ?? []).slice(0, 5);
  const primaryTakeaway =
    item.recommendation?.primaryTakeaway?.trim() ||
    expl?.reasonShort?.trim() ||
    item.shortReason?.trim() ||
    '';

  return {
    id: item.matchId,
    pairLabel: `${item.a.name} · ${item.b.name}`,
    score,
    reasonShort,
    chips,
    primaryTakeaway,
  };
}

export function sortMatchesByScoreDesc(cards: GenericMatchCardModel[]): GenericMatchCardModel[] {
  return [...cards].sort((a, b) => b.score - a.score);
}
