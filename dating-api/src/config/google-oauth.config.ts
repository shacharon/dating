function trimOrUndefined(raw: string | undefined): string | undefined {
  const t = raw?.trim();
  return t ? t : undefined;
}

/**
 * Allowed Google OAuth client IDs for id_token audience verification.
 * - GOOGLE_CLIENT_IDS: comma-separated list (web, Android, iOS, …)
 * - GOOGLE_CLIENT_ID: included in union when also set (backward compat)
 * - Returns deduped non-empty strings in first-seen order
 */
export function parseGoogleClientIds(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  const append = (raw: string | undefined): void => {
    const id = trimOrUndefined(raw);
    if (!id || seen.has(id)) {
      return;
    }
    seen.add(id);
    ids.push(id);
  };

  const listRaw = trimOrUndefined(env.GOOGLE_CLIENT_IDS);
  if (listRaw) {
    for (const part of listRaw.split(',')) {
      append(part);
    }
  }

  append(env.GOOGLE_CLIENT_ID);

  return ids;
}
