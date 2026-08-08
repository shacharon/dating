/**
 * Query params for `GET /api/v1/me/matches`.
 *
 * Transport-only (`cursor`, `limit`). Response assembly lives in
 * `me-matches-response.mapper.ts` / `dto/me-matches-response.dto.ts`.
 * Invalid cursors are thrown as domain `MatchListInvalidCursorError` from
 * `MeMatchesService.list` after decode — this module only parses `limit`.
 */
import { BadRequestException } from '@nestjs/common';

export const DEFAULT_MATCH_LIST_LIMIT = 20;
export const MAX_MATCH_LIST_LIMIT = 50;

export function parseMatchListLimit(limitStr?: string): number {
  if (limitStr === undefined || limitStr.trim() === '') {
    return DEFAULT_MATCH_LIST_LIMIT;
  }
  const parsed = Number.parseInt(limitStr, 10);
  if (
    !Number.isFinite(parsed) ||
    parsed < 1 ||
    parsed > MAX_MATCH_LIST_LIMIT
  ) {
    throw new BadRequestException(
      `Invalid match list limit (1–${MAX_MATCH_LIST_LIMIT}).`,
    );
  }
  return parsed;
}

export type MeMatchesListQuery = {
  cursor?: string;
  limit: number;
};
