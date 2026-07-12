/** Legacy persisted match JSON may only have `overall`; prefer `finalScore` when both exist. */
export type EngineFinalScoreSource = {
  finalScore?: number;
  overall?: number;
};

/** Canonical engine headline score (read path only — do not write `overall`). */
export function resolveEngineFinalScore(record: EngineFinalScoreSource): number {
  const raw = record.finalScore ?? record.overall;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}
