import type { MatchingRankingSignalsSnapshot } from '../../canonical/matching-canonical.types';
import type { HolyGrailProfileMappingInput } from '../profile-sources.types';
import { INTEREST_TAG_SET } from '../interest-tags-text.extract';
import { LIFESTYLE_SIGNAL_TAG_SET } from '../lifestyle-signals-text.extract';
import { PERSONALITY_TRAIT_TAG_SET } from '../personality-traits-text.extract';
import { assertNoExtraKeys, assertPlainRecord } from './canonical-mapper.validation';

const RANKING_SIGNALS_KEYS = new Set<string>([
  'dailyRhythm',
  'autonomyTogetherness',
  'conflictStyle',
  'lifestylePace',
  'interestsTop',
  'personalityTraitsSelf',
  'personalityTraitsPartner',
  'lifestyleSignalsSelf',
  'lifestyleSignalsPartner',
  'interestTagsSelf',
  'interestTagsPartner',
]);

export function validateRankingSignalsSlice(
  rs: HolyGrailProfileMappingInput['rankingSignals'],
): void {
  if (rs === undefined) {
    return;
  }
  assertPlainRecord(rs as unknown as Record<string, unknown>, 'rankingSignals');
  assertNoExtraKeys(
    rs as unknown as Record<string, unknown>,
    RANKING_SIGNALS_KEYS,
    'rankingSignals',
  );
  const o = rs as unknown as Record<string, unknown>;
  const dr = o.dailyRhythm;
  const at = o.autonomyTogetherness;
  if (dr !== null && dr !== undefined && typeof dr !== 'string') {
    throw new Error(
      'HolyGrail map: rankingSignals.dailyRhythm must be string or null',
    );
  }
  if (at !== null && at !== undefined && typeof at !== 'string') {
    throw new Error(
      'HolyGrail map: rankingSignals.autonomyTogetherness must be string or null',
    );
  }
  const cs = o.conflictStyle;
  const lp = o.lifestylePace;
  if (
    cs !== null &&
    cs !== undefined &&
    (typeof cs !== 'number' || !Number.isFinite(cs))
  ) {
    throw new Error(
      'HolyGrail map: rankingSignals.conflictStyle must be a finite number or null',
    );
  }
  if (
    lp !== null &&
    lp !== undefined &&
    (typeof lp !== 'number' || !Number.isFinite(lp))
  ) {
    throw new Error(
      'HolyGrail map: rankingSignals.lifestylePace must be a finite number or null',
    );
  }
  const it = o.interestsTop;
  if (!Array.isArray(it)) {
    throw new Error(
      'HolyGrail map: rankingSignals.interestsTop must be an array',
    );
  }
  for (let i = 0; i < it.length; i++) {
    if (typeof it[i] !== 'string') {
      throw new Error(
        `HolyGrail map: rankingSignals.interestsTop[${i}] must be a string`,
      );
    }
  }
  for (const key of [
    'personalityTraitsSelf',
    'personalityTraitsPartner',
  ] as const) {
    const arr = o[key];
    if (arr === undefined) {
      continue;
    }
    if (!Array.isArray(arr)) {
      throw new Error(
        `HolyGrail map: rankingSignals.${key} must be an array when provided`,
      );
    }
    for (let i = 0; i < arr.length; i++) {
      if (
        typeof arr[i] !== 'string' ||
        !PERSONALITY_TRAIT_TAG_SET.has(arr[i])
      ) {
        throw new Error(
          `HolyGrail map: rankingSignals.${key}[${i}] must be a canonical personality trait tag`,
        );
      }
    }
  }
  for (const key of [
    'lifestyleSignalsSelf',
    'lifestyleSignalsPartner',
  ] as const) {
    const arr = o[key];
    if (arr === undefined) {
      continue;
    }
    if (!Array.isArray(arr)) {
      throw new Error(
        `HolyGrail map: rankingSignals.${key} must be an array when provided`,
      );
    }
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string' || !LIFESTYLE_SIGNAL_TAG_SET.has(arr[i])) {
        throw new Error(
          `HolyGrail map: rankingSignals.${key}[${i}] must be a canonical lifestyle signal tag`,
        );
      }
    }
  }
  for (const key of ['interestTagsSelf', 'interestTagsPartner'] as const) {
    const arr = o[key];
    if (arr === undefined) {
      continue;
    }
    if (!Array.isArray(arr)) {
      throw new Error(
        `HolyGrail map: rankingSignals.${key} must be an array when provided`,
      );
    }
    for (let i = 0; i < arr.length; i++) {
      if (typeof arr[i] !== 'string' || !INTEREST_TAG_SET.has(arr[i])) {
        throw new Error(
          `HolyGrail map: rankingSignals.${key}[${i}] must be a canonical interest tag`,
        );
      }
    }
  }
}

export function mapRankingSignalsSnapshot(
  rs: NonNullable<HolyGrailProfileMappingInput['rankingSignals']>,
): MatchingRankingSignalsSnapshot {
  return {
    dailyRhythm: rs.dailyRhythm,
    autonomyTogetherness: rs.autonomyTogetherness,
    conflictStyle: rs.conflictStyle,
    lifestylePace: rs.lifestylePace,
    interestsTop: [...rs.interestsTop],
    ...(rs.personalityTraitsSelf !== undefined &&
    rs.personalityTraitsSelf.length > 0
      ? { personalityTraitsSelf: [...rs.personalityTraitsSelf] }
      : {}),
    ...(rs.personalityTraitsPartner !== undefined &&
    rs.personalityTraitsPartner.length > 0
      ? { personalityTraitsPartner: [...rs.personalityTraitsPartner] }
      : {}),
    ...(rs.lifestyleSignalsSelf !== undefined &&
    rs.lifestyleSignalsSelf.length > 0
      ? { lifestyleSignalsSelf: [...rs.lifestyleSignalsSelf] }
      : {}),
    ...(rs.lifestyleSignalsPartner !== undefined &&
    rs.lifestyleSignalsPartner.length > 0
      ? { lifestyleSignalsPartner: [...rs.lifestyleSignalsPartner] }
      : {}),
    ...(rs.interestTagsSelf !== undefined && rs.interestTagsSelf.length > 0
      ? { interestTagsSelf: [...rs.interestTagsSelf] }
      : {}),
    ...(rs.interestTagsPartner !== undefined &&
    rs.interestTagsPartner.length > 0
      ? { interestTagsPartner: [...rs.interestTagsPartner] }
      : {}),
  };
}
