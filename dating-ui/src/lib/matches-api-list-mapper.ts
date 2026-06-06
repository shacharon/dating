import type { MatchExplainabilityDto } from '@/app/dating/_lib/types';

/**
 * View model shared by POC matches UIs (legacy engine list card).
 * Populated from GET /api/matches items ({@link MatchesApiListItemRaw}), not GET /api/v1/matches.
 */
export interface MatchListItemViewModel {
  matchId: string;
  a: { id: string; name: string };
  b: { id: string; name: string };
  finalScore: number;
  updatedAt: string;
  shortReason?: string;
  explainability?: MatchExplainabilityDto;
}

/** Subset of `MatchesApiItemDto` from dating-api `MatchesApiController` list. */
export interface MatchesApiListItemRaw {
  matchId: string;
  userAId: string;
  userBId: string;
  userAName: string;
  userBName: string;
  finalScore: number;
  updatedAt: string;
  shortReason: string;
  explainability?: MatchExplainabilityDto;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

export function mapMatchesApiListItemToViewModel(
  raw: unknown,
): MatchListItemViewModel | null {
  if (!isRecord(raw)) return null;
  const matchId = raw.matchId;
  const userAId = raw.userAId;
  const userBId = raw.userBId;
  const userAName = raw.userAName;
  const userBName = raw.userBName;
  const finalScore = raw.finalScore;
  const updatedAt = raw.updatedAt;
  if (
    typeof matchId !== 'string' ||
    typeof userAId !== 'string' ||
    typeof userBId !== 'string' ||
    typeof userAName !== 'string' ||
    typeof userBName !== 'string' ||
    typeof updatedAt !== 'string'
  ) {
    return null;
  }
  const score =
    typeof finalScore === 'number' && Number.isFinite(finalScore) ? finalScore : 0;
  const sr = raw.shortReason;
  const expl = raw.explainability;
  return {
    matchId,
    a: { id: userAId, name: userAName },
    b: { id: userBId, name: userBName },
    finalScore: score,
    updatedAt,
    ...(typeof sr === 'string' ? { shortReason: sr } : {}),
    ...(isExplainabilityDto(expl) ? { explainability: expl } : {}),
  };
}

function isExplainabilityDto(v: unknown): v is MatchExplainabilityDto {
  if (!isRecord(v)) return false;
  return Array.isArray(v.positiveChips) && typeof v.reasonShort === 'string';
}

/** Maps GET /api/matches JSON `items` to the legacy-shaped list used by POC tooling. */
export function mapMatchesApiListResponseToViewModels(data: unknown): MatchListItemViewModel[] {
  if (!isRecord(data) || !Array.isArray(data.items)) return [];
  const out: MatchListItemViewModel[] = [];
  for (const item of data.items) {
    const m = mapMatchesApiListItemToViewModel(item);
    if (m) out.push(m);
  }
  return out;
}
