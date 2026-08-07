import type { BreakdownEntry } from '../compatibility/compatibility-score';

import { computePairScore } from '../compatibility/compatibility-score';



export const EXPANSION_03_SHADOW_CHIP_KEYS = ['humorPlayfulness'] as const;



export type Expansion03ShadowChipKey =

  (typeof EXPANSION_03_SHADOW_CHIP_KEYS)[number];



export const SHADOW_POSITIVE_CHIP_BY_SIGNAL: Record<

  Expansion03ShadowChipKey,

  string

> = {

  humorPlayfulness: 'Shared playfulness',

};



export const SHADOW_SIGNAL_DOMAIN: Record<Expansion03ShadowChipKey, string> = {

  humorPlayfulness: 'connection',

};



export function isExpansion03ShadowChipKey(

  key: string,

): key is Expansion03ShadowChipKey {

  return (EXPANSION_03_SHADOW_CHIP_KEYS as readonly string[]).includes(key);

}



export function buildExpansion03ShadowBreakdown(

  signalsA: Record<string, number | null>,

  signalsB: Record<string, number | null>,

): BreakdownEntry[] {

  const out: BreakdownEntry[] = [];

  for (const key of EXPANSION_03_SHADOW_CHIP_KEYS) {

    const self = signalsA[key];

    const partner = signalsB[key];

    if (self == null || partner == null) continue;

    if (!Number.isFinite(self) || !Number.isFinite(partner)) continue;

    const gap = Math.abs(self - partner);

    out.push({

      key,

      self,

      partner,

      gap,

      pairScore: computePairScore(self, partner),

    });

  }

  return out;

}

