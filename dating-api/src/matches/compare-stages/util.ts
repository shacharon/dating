/** Shared numeric / display helpers for compare stages. */

export function formatSignalKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export function clampTo100(x: number): number {
  return Math.max(0, Math.min(100, Math.round(x)));
}
