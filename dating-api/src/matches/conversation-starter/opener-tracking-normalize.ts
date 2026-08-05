/** Normalize opener / message text for edit detection (Architect lock — no Levenshtein). */
export function normalizeOpenerCompareText(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

export function wasOpenerEdited(
  sentText: string,
  originalOpener: string,
): boolean {
  return (
    normalizeOpenerCompareText(sentText) !==
    normalizeOpenerCompareText(originalOpener)
  );
}
