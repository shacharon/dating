/** True when building static export for Capacitor (`CAPACITOR_BUILD=1`). */
export function isCapacitorBuild(): boolean {
  return process.env.CAPACITOR_BUILD === "1";
}
