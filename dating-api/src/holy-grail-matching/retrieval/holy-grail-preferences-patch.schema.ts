import { z } from 'zod';

/**
 * Structural validation for `structuredPreferencesPatch` request bodies before merge/value validation.
 * Values (e.g. `similarityPreference`) are enforced by `mergeHolyGrailStructuredPreferencesPatch`.
 */
export const holyGrailStructuredPreferencesPatchBodySchema = z.record(z.string(), z.unknown());

export type HolyGrailStructuredPreferencesPatchBody = z.infer<typeof holyGrailStructuredPreferencesPatchBodySchema>;

export function parseHolyGrailStructuredPreferencesPatchBody(body: unknown): HolyGrailStructuredPreferencesPatchBody {
  return holyGrailStructuredPreferencesPatchBodySchema.parse(body);
}
