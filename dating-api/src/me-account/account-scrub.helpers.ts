/**
 * Shared scrub labels for soft-deleted accounts (service + adapter).
 */
export function scrubbedDeletedUserEmail(userId: string): string {
  return `deleted+${userId}@deleted.invalid`;
}

export function scrubbedDeletedUserGoogleId(userId: string): string {
  return `deleted+${userId}`;
}
