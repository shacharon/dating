import type { ChildrenUnsureDirectionsDto } from './match.types';
import type { MatchListItemDto } from './matches.service';
import { resolveEngineFinalScore } from './match-score.util';
import { anyChildrenUnsure, getDisplayScore } from './children-unsure.helpers';
import { tryPickHolyGrailMatchDiagnosticsDto } from './holy-grail-match-diagnostics.wire';
import {
  MATCH_PREVIEW_AGE_PLACEHOLDER,
  MATCH_PREVIEW_CHIPS_SLICE,
} from './children-unsure.product-policy';

/** UI-friendly match preview for /dating/matches list. */
export interface DatingMatchPreviewDto {
  id: string;
  name: string;
  age: number;
  summary: string;
  compatibilityScore: number;
  strongReason: string;
  frictionPoint: string;
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
  children_unsure?: ChildrenUnsureDirectionsDto;
  /** Same as displayed compatibility score under `MATCH_RANKING_CONTRACT` (`HG_GATE_LEGACY_RANK_V1` — legacy-only sort). */
  engineCompatibilityScore?: number;
  /** Optional HG diagnostic triple only; omitted when list row has no valid HG wire slice. */
  readonly hgMutualPass?: boolean;
  readonly hgOverallStatus?: string;
  readonly hgRankScore?: number;
}

export function mapMatchListItemToPreview(
  item: MatchListItemDto,
): DatingMatchPreviewDto {
  const engineScore = resolveEngineFinalScore(item);
  const rankScore = getDisplayScore(item);
  const otherPerson = item.b;
  const chips =
    item.explainability?.positiveChips?.slice(0, MATCH_PREVIEW_CHIPS_SLICE) ??
    [];

  const hasChildrenUnsure = anyChildrenUnsure(item.children_unsure);
  const hgPreview = tryPickHolyGrailMatchDiagnosticsDto(item);

  return {
    id: item.matchId,
    name: otherPerson.name,
    age: MATCH_PREVIEW_AGE_PLACEHOLDER,
    summary: `Match score: ${Math.round(rankScore)}`,
    compatibilityScore: Math.round(rankScore),
    strongReason: item.shortReason || 'Good compatibility',
    frictionPoint: item.explainability?.tensionChip || 'No major tensions',
    ...(item.explainability && { explainability: item.explainability }),
    ...(item.recommendation && { recommendation: item.recommendation }),
    ...(item.children_unsure && { children_unsure: item.children_unsure }),
    ...(hasChildrenUnsure && {
      engineCompatibilityScore: Math.round(engineScore),
    }),
    ...(hgPreview ? { ...hgPreview } : {}),
  };
}
