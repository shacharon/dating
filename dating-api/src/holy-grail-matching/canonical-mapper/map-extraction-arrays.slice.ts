import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import { assertNoExtraKeys, assertPlainRecord } from './canonical-mapper.validation';

const EXTRACTION_ARRAYS_KEYS = new Set<string>([
  'interests_self',
  'interests',
  'lifestyleTraits',
]);

export function validateExtractionArraysSlice(
  ex: HolyGrailProfileMappingInput['extractionArrays'],
): void {
  if (ex === undefined || ex === null) {
    return;
  }
  assertPlainRecord(ex, 'extractionArrays');
  assertNoExtraKeys(ex, EXTRACTION_ARRAYS_KEYS, 'extractionArrays');
  const o = ex;
  for (const key of EXTRACTION_ARRAYS_KEYS) {
    const v = o[key];
    if (v === undefined) {
      continue;
    }
    if (!Array.isArray(v)) {
      throw new Error(
        `HolyGrail map: extractionArrays.${key} must be an array when provided`,
      );
    }
    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] !== 'string') {
        throw new Error(
          `HolyGrail map: extractionArrays.${key}[${i}] must be a string`,
        );
      }
    }
  }
}

function readStringArrayField(
  o: Record<string, unknown>,
  key: string,
): string[] {
  const v = o[key];
  if (v === undefined) {
    return [];
  }
  if (!Array.isArray(v)) {
    throw new Error(
      `HolyGrail map: extractionArrays.${key} must be an array when provided`,
    );
  }
  for (let i = 0; i < v.length; i++) {
    if (typeof v[i] !== 'string') {
      throw new Error(
        `HolyGrail map: extractionArrays.${key}[${i}] must be a string`,
      );
    }
  }
  return v as string[];
}

function normalizeInterestTag(raw: string): string {
  const s = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return s;
}

export function buildInterestTags(
  input: HolyGrailProfileMappingInput,
): string[] | undefined {
  const ex = input.extractionArrays;
  if (!ex) {
    return undefined;
  }
  const o = ex as Record<string, unknown>;
  const a = readStringArrayField(o, 'interests_self');
  const b = readStringArrayField(o, 'interests');
  const c = readStringArrayField(o, 'lifestyleTraits');
  const ordered = [...a, ...b, ...c];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ordered) {
    const t = normalizeInterestTag(raw);
    if (t.length === 0) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.length > 0 ? out : undefined;
}
