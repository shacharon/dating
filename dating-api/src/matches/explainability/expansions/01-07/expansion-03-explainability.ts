import { EXPANSION_03_CONFIG } from '../../core/expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from '../../core/expansion-shadow-breakdown';
import type { BreakdownEntry } from '../../../../compatibility/compatibility-score';

export const EXPANSION_03_SHADOW_CHIP_KEYS = EXPANSION_03_CONFIG.shadowChipKeys;

export type Expansion03ShadowChipKey =
  (typeof EXPANSION_03_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_03_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_03_CONFIG.signalDomain;

export function isExpansion03ShadowChipKey(
  key: string,
): key is Expansion03ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_03_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion03ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_03_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
