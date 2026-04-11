/**
 * Defensive parsing of optional Holy Grail diagnostic fields from match API JSON.
 * Legacy responses and partial HG payloads omit the block entirely.
 */

const HG_OVERALL_WIRE_RE = /^(PASS|FAIL):(PASS|FAIL)$/;

export type HolyGrailMatchDiagnosticsApi = {
  readonly hgMutualPass: boolean;
  readonly hgOverallStatus: string;
  readonly hgRankScore: number;
};

type UnknownHgSource = {
  hgMutualPass?: unknown;
  hgOverallStatus?: unknown;
  hgRankScore?: unknown;
};

/**
 * Returns a strict triple only when all fields are present and valid; otherwise `undefined`
 * (UI should not render a partial HG block).
 */
export function tryHolyGrailMatchDiagnosticsApi(
  source: UnknownHgSource | null | undefined,
): HolyGrailMatchDiagnosticsApi | undefined {
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
