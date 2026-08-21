import { EXPANSION_04_CONFIG } from './expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from './expansion-shadow-breakdown';
import type { BreakdownEntry } from '../compatibility/compatibility-score';

export const EXPANSION_04_SHADOW_CHIP_KEYS = EXPANSION_04_CONFIG.shadowChipKeys;

export type Expansion04ShadowChipKey =
  (typeof EXPANSION_04_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_04_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_04_CONFIG.signalDomain;

export function isExpansion04ShadowChipKey(
  key: string,
): key is Expansion04ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_04_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion04ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_04_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
