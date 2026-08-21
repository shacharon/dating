import { EXPANSION_06_CONFIG } from './expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from './expansion-shadow-breakdown';
import type { BreakdownEntry } from '../compatibility/compatibility-score';

export const EXPANSION_06_SHADOW_CHIP_KEYS = EXPANSION_06_CONFIG.shadowChipKeys;

export type Expansion06ShadowChipKey =
  (typeof EXPANSION_06_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_06_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_06_CONFIG.signalDomain;

export function isExpansion06ShadowChipKey(
  key: string,
): key is Expansion06ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_06_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion06ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_06_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
