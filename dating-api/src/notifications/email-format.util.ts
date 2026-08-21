/** Escape text for HTML email bodies (always include quote). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Nickname → displayName → fallback.
 * Fallback locked: `'Someone'`.
 */
export function displayLabel(
  nickname: string | null | undefined,
  displayName: string | null | undefined,
): string {
  const n = nickname?.trim();
  if (n) return n;
  const d = displayName?.trim();
  if (d) return d;
  return 'Someone';
}
