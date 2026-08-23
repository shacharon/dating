import type { HardBlockedDto } from '../../holy-grail-matching/hard-block-reasons';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../../matches/match-engine';

export const MATCH_LIST_RANK_PRESENTATION_VERSION = 1 as const;

export type MatchListRankPresentationJson = {
  v: typeof MATCH_LIST_RANK_PRESENTATION_VERSION;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  /** Present when rank row hardBlocked=true and DTO was built at rebuild. */
  hardBlockedDetail?: HardBlockedDto;
};

export function toPresentationJson(item: {
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  hardBlocked?: HardBlockedDto;
}): MatchListRankPresentationJson {
  return {
    v: MATCH_LIST_RANK_PRESENTATION_VERSION,
    explainability: item.explainability,
    recommendation: item.recommendation,
    ...(item.hardBlocked !== undefined
      ? { hardBlockedDetail: item.hardBlocked }
      : {}),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parsePresentationJson(
  raw: unknown,
): MatchListRankPresentationJson | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (raw.v !== MATCH_LIST_RANK_PRESENTATION_VERSION) {
    return null;
  }
  if (!('explainability' in raw) || !('recommendation' in raw)) {
    return null;
  }
  return raw as MatchListRankPresentationJson;
}
