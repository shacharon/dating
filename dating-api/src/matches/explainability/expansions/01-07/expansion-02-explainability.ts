import { EXPANSION_02_CONFIG } from '../../core/expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from '../../core/expansion-shadow-breakdown';
import type { BreakdownEntry } from '../../../../compatibility/compatibility-score';

export const EXPANSION_02_SHADOW_CHIP_KEYS = EXPANSION_02_CONFIG.shadowChipKeys;

export type Expansion02ShadowChipKey =
  (typeof EXPANSION_02_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_02_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_02_CONFIG.signalDomain;

export function isExpansion02ShadowChipKey(
  key: string,
): key is Expansion02ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_02_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion02ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_02_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
