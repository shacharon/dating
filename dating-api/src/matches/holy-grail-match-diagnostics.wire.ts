/**
 * Internal / list-detail enrichment: all three fields are set together.
 * `hgRankScore` maps to persisted `hgSoftPassCount` (SOFT_PASS dimension count, both directions).
 */
export interface HolyGrailMatchDiagnosticsDto {
  readonly hgMutualPass: boolean;
  readonly hgOverallStatus: string;
  readonly hgRankScore: number;
}

const HG_OVERALL_WIRE_RE = /^(PASS|FAIL):(PASS|FAIL)$/;

/**
 * Returns a strict triple for JSON responses, or `undefined` if the payload is partial/invalid.
 * Prevents asymmetric HG keys from reaching clients when upstream data is corrupted.
 */
export function tryPickHolyGrailMatchDiagnosticsDto(
  source:
    | HolyGrailMatchDiagnosticsDto
    | Partial<Record<'hgMutualPass' | 'hgOverallStatus' | 'hgRankScore', unknown>>
    | null
    | undefined,
): HolyGrailMatchDiagnosticsDto | undefined {
  if (source == null || typeof source !== 'object') return undefined;
  const { hgMutualPass, hgOverallStatus, hgRankScore } = source;
  if (typeof hgMutualPass !== 'boolean') return undefined;
  if (typeof hgOverallStatus !== 'string' || !HG_OVERALL_WIRE_RE.test(hgOverallStatus.trim())) {
    return undefined;
  }
  if (typeof hgRankScore !== 'number' || !Number.isFinite(hgRankScore)) return undefined;
  return {
    hgMutualPass,
    hgOverallStatus: hgOverallStatus.trim(),
    hgRankScore,
  };
}
