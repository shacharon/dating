export function lastReadFieldForUser(
  userId1: string,
  sessionUserId: string,
): 'user1LastReadAt' | 'user2LastReadAt' {
  return userId1 === sessionUserId ? 'user1LastReadAt' : 'user2LastReadAt';
}

export function lastReadAtForUser(
  match: {
    userId1: string;
    userId2: string;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  },
  sessionUserId: string,
): Date | null {
  return match.userId1 === sessionUserId
    ? match.user1LastReadAt
    : match.user2LastReadAt;
}

export function lastReadAtIsoForUser(
  match: {
    userId1: string;
    userId2: string;
    user1LastReadAt: Date | null;
    user2LastReadAt: Date | null;
  },
  sessionUserId: string,
): string | null {
  const at = lastReadAtForUser(match, sessionUserId);
  return at?.toISOString() ?? null;
}
