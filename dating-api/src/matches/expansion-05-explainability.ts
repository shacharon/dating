import { EXPANSION_05_CONFIG } from './expansion-explainability-config';
import {
  buildStandardShadowBreakdown,
  isShadowChipKeyIn,
} from './expansion-shadow-breakdown';
import type { BreakdownEntry } from '../compatibility/compatibility-score';

export const EXPANSION_05_SHADOW_CHIP_KEYS = EXPANSION_05_CONFIG.shadowChipKeys;

export type Expansion05ShadowChipKey =
  (typeof EXPANSION_05_SHADOW_CHIP_KEYS)[number];

export const SHADOW_POSITIVE_CHIP_BY_SIGNAL =
  EXPANSION_05_CONFIG.positiveChipBySignal;

export const SHADOW_SIGNAL_DOMAIN = EXPANSION_05_CONFIG.signalDomain;

export function isExpansion05ShadowChipKey(
  key: string,
): key is Expansion05ShadowChipKey {
  return isShadowChipKeyIn(EXPANSION_05_SHADOW_CHIP_KEYS, key);
}

export function buildExpansion05ShadowBreakdown(
  signalsA: Record<string, number | null>,
  signalsB: Record<string, number | null>,
): BreakdownEntry[] {
  return buildStandardShadowBreakdown(
    EXPANSION_05_SHADOW_CHIP_KEYS,
    signalsA,
    signalsB,
  );
}
