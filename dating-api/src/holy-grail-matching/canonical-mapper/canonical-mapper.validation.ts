import type { HolyGrailProfileMappingInput } from '../profile-sources.types';

/** Top-level keys allowed on `HolyGrailProfileMappingInput` at runtime. */
const MAPPING_INPUT_KEYS = new Set<string>([
  'profileId',
  'extractionArrays',
  'structuredFacts',
  'structuredPreferences',
  'searchOverrides',
  'rankingSignals',
  'dealbreakerSignals',
  'dealbreakerSelfFacts',
]);

export function assertPlainRecord(
  value: unknown,
  context: string,
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`HolyGrail map: ${context} must be a plain object`);
  }
}

export function assertNoExtraKeys(
  obj: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  context: string,
): void {
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) {
      throw new Error(
        `HolyGrail map: unexpected key ${JSON.stringify(k)} in ${context}`,
      );
    }
  }
}

export function validateMappingInputShape(
  input: HolyGrailProfileMappingInput,
): void {
  assertPlainRecord(input, 'map input');
  assertNoExtraKeys(
    input as Record<string, unknown>,
    MAPPING_INPUT_KEYS,
    'map input',
  );
}

export function assertInEnum(
  value: string,
  allowed: readonly string[],
  field: string,
): string {
  if (!allowed.includes(value)) {
    throw new Error(
      `HolyGrail map: invalid ${field}: ${JSON.stringify(value)} (not in enum allowlist)`,
    );
  }
  return value;
}

/** Reject non-strings before enum check (runtime JSON safety). */
export function assertStringInEnum(
  value: unknown,
  allowed: readonly string[],
  field: string,
): string {
  if (typeof value !== 'string') {
    throw new Error(
      `HolyGrail map: ${field} must be a string enum value, got ${typeof value}`,
    );
  }
  return assertInEnum(value, allowed, field);
}

export function assertNonEmptyProfileId(id: unknown): string {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error('HolyGrail map: profileId must be a non-empty string');
  }
  return id.trim();
}

export function assertPositiveFiniteKm(n: unknown, field: string): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) {
    throw new Error(`HolyGrail map: ${field} must be a finite number > 0`);
  }
  return n;
}
