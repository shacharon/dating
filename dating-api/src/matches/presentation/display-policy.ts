/**
 * Display policy for the match engine: directional display calibration when coverage is low and directionals are high.
 * No formula changes.
 */

/** Final calibration: reduce displayed directionals when coverage is medium/low and directionals are very high (>92). */
const DIRECTIONAL_INFLATION_COVERAGE_THRESHOLD = 65;
const DIRECTIONAL_INFLATION_CUTOFF = 92;
const DIRECTIONAL_INFLATION_SCALE = 0.96;

function clampTo100(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}

export function applyDirectionalDisplayCalibration(
  aToB: number,
  bToA: number,
  coveragePercentValue: number,
): { displayAToB: number; displayBToA: number } {
  let displayAToB = aToB;
  let displayBToA = bToA;
  if (
    coveragePercentValue <= DIRECTIONAL_INFLATION_COVERAGE_THRESHOLD &&
    (aToB > DIRECTIONAL_INFLATION_CUTOFF || bToA > DIRECTIONAL_INFLATION_CUTOFF)
  ) {
    displayAToB = clampTo100(Math.round(aToB * DIRECTIONAL_INFLATION_SCALE));
    displayBToA = clampTo100(Math.round(bToA * DIRECTIONAL_INFLATION_SCALE));
  }
  return { displayAToB, displayBToA };
}
