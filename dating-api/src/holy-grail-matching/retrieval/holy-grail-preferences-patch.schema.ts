import { z } from 'zod';

/**
 * Structural validation for `structuredPreferencesPatch` request bodies before merge/value validation.
 * Allowed keys are exactly `HOLY_GRAIL_STRUCTURED_PREFERENCES_JSON_KEYS` — enforced by
 * `mergeHolyGrailStructuredPreferencesPatch` (unknown keys rejected; same allow-list as DB parse).
 */
export const holyGrailStructuredPreferencesPatchBodySchema = z.record(z.string(), z.unknown());

export type HolyGrailStructuredPreferencesPatchBody = z.infer<typeof holyGrailStructuredPreferencesPatchBodySchema>;

export function parseHolyGrailStructuredPreferencesPatchBody(body: unknown): HolyGrailStructuredPreferencesPatchBody {
  return holyGrailStructuredPreferencesPatchBodySchema.parse(body);
}
