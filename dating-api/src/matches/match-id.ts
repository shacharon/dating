/** Deterministic match id: lexicographic minId__maxId (same as legacy `toMatchId`). */
export function toCanonicalMatchId(aId: string, bId: string): string {
  const [minId, maxId] = [aId, bId].sort((x, y) => x.localeCompare(y));
  return `${minId}__${maxId}`;
}
