/**
 * Map thrown admin API errors to English UI strings (admin is not product-i18n).
 */
export function messageFromAdminFetchError(
  error: unknown,
  opts: { forbiddenMessage: string; fallbackMessage: string },
): string {
  if (error instanceof Error && error.message === 'admin_forbidden') {
    return opts.forbiddenMessage;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return opts.fallbackMessage;
}
