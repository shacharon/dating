/**
 * Normalized Jaccard interest-overlap score for the match engine.
 * 0–100 (integer); deterministic; no framework deps.
 *
 * Mirrors the former HG interests Jaccard overlap (retired five-signal ranker).
 * but returns a bounded 0–100 integer instead of weighted points.
 */

function normTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, '_');
}

/**
 * Compute interest alignment between two interest tag arrays (0–100).
 *
 * - Both empty → 0.
 * - One side empty → small floor: round(10 × min(1, k/5)) where k = non-empty side count.
 * - Both non-empty → round(|A ∩ B| / |A ∪ B| × 100).
 */
export function computeInterestAlignment(
  tagsA: readonly string[],
  tagsB: readonly string[],
): number {
  const setA = new Set(tagsA.map(normTag).filter((x) => x.length > 0));
  const setB = new Set(tagsB.map(normTag).filter((x) => x.length > 0));

  if (setA.size === 0 && setB.size === 0) return 0;

  if (setA.size === 0 || setB.size === 0) {
    const k = Math.max(setA.size, setB.size);
    return Math.round(10 * Math.min(1, k / 5));
  }

  let inter = 0;
  for (const x of setA) {
    if (setB.has(x)) inter += 1;
  }
  const union = setA.size + setB.size - inter;
  const jacc = union > 0 ? inter / union : 0;
  return Math.round(jacc * 100);
}

/**
 * Return the intersection of two tag arrays (normalized, deduplicated).
 * Used for explainability ("you both like X").
 */
export function sharedInterestTags(
  tagsA: readonly string[],
  tagsB: readonly string[],
): string[] {
  const setB = new Set(tagsB.map(normTag).filter((x) => x.length > 0));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of tagsA) {
    const n = normTag(raw);
    if (n.length > 0 && setB.has(n) && !seen.has(n)) {
      seen.add(n);
      out.push(raw.trim());
    }
  }
  return out;
}
