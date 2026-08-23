import { EXPANSION_01_CONFIG } from '../../core/expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from '../../core/expansion-shadow-breakdown';
import type { BreakdownEntry } from '../../../../compatibility/compatibility-score';

export const EXPANSION_01_SHADOW_CHIP_KEYS = EXPANSION_01_CONFIG.shadowChipKeys;

export type Expansion01ShadowChipKey =
  (typeof EXPANSION_01_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_01_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_01_CONFIG.signalDomain;

export function isExpansion01ShadowChipKey(
  key: string,
): key is Expansion01ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_01_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion01ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_01_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
