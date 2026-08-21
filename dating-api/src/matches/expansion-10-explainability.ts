import { EXPANSION_10_CONFIG } from './expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from './expansion-shadow-breakdown';
import type { BreakdownEntry } from '../compatibility/compatibility-score';

export const EXPANSION_10_SHADOW_CHIP_KEYS = EXPANSION_10_CONFIG.shadowChipKeys;

export type Expansion10ShadowChipKey =
  (typeof EXPANSION_10_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_10_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_10_CONFIG.signalDomain;

export function isExpansion10ShadowChipKey(
  key: string,
): key is Expansion10ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_10_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion10ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_10_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
