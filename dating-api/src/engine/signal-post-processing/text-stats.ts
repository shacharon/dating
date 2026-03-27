/**
 * Text statistics helper for extraction sparse-input detection.
 * Pure function; no side effects.
 */

export interface TextStats {
  length: number;
  wordCount: number;
}

/**
 * Compute basic text statistics (length and word count).
 * Used by sparse-input guards to determine coverage caps.
 */
export function getTextStats(text: string): TextStats {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return {
    length: trimmed.length,
    wordCount,
  };
}
