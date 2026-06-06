/**
 * Maps GET /api/v1/matches list items to generic match cards (no scoring logic).
 */

import { anyChildrenUnsure, getDisplayScore } from './children-unsure';
import {
  tryHolyGrailMatchDiagnosticsApi,
  type HolyGrailMatchDiagnosticsApi,
} from './holy-grail-match-diagnostics';

export interface MatchListItemApi {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  finalScore: number;
  rankingScore?: number;
  engineFinalScore?: number;
  children_unsure?: {
    profile_a_to_profile_b: boolean;
    profile_b_to_profile_a: boolean;
  };
  updatedAt: string;
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
  /** Read-only HG diagnostics when API returns full triple (`hgSoftPassCount` as hgRankScore). */
  hgMutualPass?: boolean;
  hgOverallStatus?: string;
  hgRankScore?: number;
}

export interface GenericMatchCardModel {
  id: string;
  /** Both profile names from the list row (MatchListItemDto a/b). */
  pairLabel: string;
  score: number;
  reasonShort: string;
  chips: string[];
  primaryTakeaway: string;
  /** True if HG children_unsure applies in either direction. */
  childrenUnsure?: boolean;
  /** Present only when API returned a valid HG triple; does not affect score display. */
  holyGrailDiagnostics?: HolyGrailMatchDiagnosticsApi;
}

function effectiveExplainability(item: MatchListItemApi) {
  return item.recommendation?.explainability ?? item.explainability;
}

export function mapListItemToCard(item: MatchListItemApi): GenericMatchCardModel {
  const expl = effectiveExplainability(item);
  const score = Math.round(getDisplayScore(item));
  const childrenUnsure = anyChildrenUnsure(item.children_unsure);
  const reasonShort =
    expl?.reasonShort?.trim() || item.shortReason?.trim() || '';
  const chips = (expl?.positiveChips ?? []).slice(0, 5);
  const primaryTakeaway =
    item.recommendation?.primaryTakeaway?.trim() ||
    expl?.reasonShort?.trim() ||
    item.shortReason?.trim() ||
    '';

  const holyGrailDiagnostics = tryHolyGrailMatchDiagnosticsApi(item);

  return {
    id: item.matchId,
    pairLabel: `${item.a.name} · ${item.b.name}`,
    score,
    reasonShort,
    chips,
    primaryTakeaway,
    ...(childrenUnsure ? { childrenUnsure: true } : {}),
    ...(holyGrailDiagnostics ? { holyGrailDiagnostics } : {}),
  };
}
