/** Parses `hideChildrenUnsure` query flag (API and UI must stay aligned). */
export function parseHideChildrenUnsure(raw: string | undefined): boolean {
  if (raw == null || raw === '') return false;
  const v = raw.toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
