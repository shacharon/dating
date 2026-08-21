/**
 * Shared keyword text-match helpers for Holy Grail free-text extractors.
 * Sprint 60 Story 2 — SoT for HG `escapeRegExp` / lightweight `isNegatedBefore`.
 *
 * Enrichment-v2 keeps its own wider-window negation; do not unify without a freeze RFC.
 */

/**
 * Escape special regex characters for literal matching.
 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Lightweight "not …" scope before a match (up to 6 intervening words).
 * Identical to pre-Story-02 HG extractor copies.
 */
export function isNegatedBefore(
  haystackLower: string,
  matchStart: number,
): boolean {
  const before = haystackLower.slice(0, matchStart);
  const t = before.trimEnd();
  return /\bnot(\s+[\w'-]+){0,6}\s*$/i.test(t);
}
