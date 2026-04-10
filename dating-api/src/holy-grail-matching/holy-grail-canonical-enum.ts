/**
 * Single source for canonical enum sets / string allowlists used by Holy Grail ingestion:
 * DB JSON parse (lenient), merge (strict), and mapper (strict).
 */

/** All string values of a string enum object (TS `Object.values` on const string enums). */
export function matchingCanonicalEnumStringValues<E extends Record<string, string>>(e: E): string[] {
  return Object.values(e).filter((v): v is string => typeof v === 'string');
}

export function matchingCanonicalEnumMemberSet(e: Record<string, string>): Set<string> {
  return new Set(matchingCanonicalEnumStringValues(e));
}

export function pickMatchingCanonicalEnumMember<T extends string>(
  v: unknown,
  allowed: Set<string>,
): T | undefined {
  if (typeof v !== 'string' || !allowed.has(v)) return undefined;
  return v as T;
}
