/**
 * Compute friction and tension list from two enriched signal sets.
 * Uses tension-rules and clamps total penalty to 0..10 for friction.
 */

import type { EnrichedSignals } from './tension-rules';
import { tensionRules } from './tension-rules';

export interface TensionEntry {
  id: string;
  name: string;
  penalty: number;
  explain: string;
}

export interface ComputeFrictionResult {
  friction: number;
  tensions: TensionEntry[];
}

const FUSION_KEYWORDS = [
  'one soul',
  'no secrets',
  'shared bank accounts',
  'everything together',
];

const BOUNDARIES_KEYWORDS = ['boundaries', 'needs space'];

function hasKeyword(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

/**
 * Derive fusionNeed and boundariesNeed from profile texts and merge into signals.
 */
export function applyKeywordTriggers(
  signals: Record<string, number | null> | EnrichedSignals,
  texts: { aboutMe?: string; aboutRelationship?: string },
): EnrichedSignals {
  const combined =
    typeof texts.aboutMe === 'string' && typeof texts.aboutRelationship === 'string'
      ? `${texts.aboutMe} ${texts.aboutRelationship}`
      : [texts.aboutMe, texts.aboutRelationship].filter(Boolean).join(' ');
  const enriched: EnrichedSignals = { ...signals };
  const currentFusion =
    typeof (signals as EnrichedSignals).fusionNeed === 'number'
      ? (signals as EnrichedSignals).fusionNeed!
      : 0;
  const currentBoundaries =
    typeof (signals as EnrichedSignals).boundariesNeed === 'number'
      ? (signals as EnrichedSignals).boundariesNeed!
      : 0;
  if (hasKeyword(combined, FUSION_KEYWORDS)) {
    enriched.fusionNeed = Math.max(currentFusion, 9);
  }
  if (hasKeyword(combined, BOUNDARIES_KEYWORDS)) {
    enriched.boundariesNeed = Math.max(currentBoundaries, 8);
  }
  return enriched;
}

/**
 * Compute friction (0..10) and list of firing tensions from two enriched signal sets.
 */
export function computeFriction(
  enrichedA: EnrichedSignals,
  enrichedB: EnrichedSignals,
): ComputeFrictionResult {
  const tensions: TensionEntry[] = [];
  let sumPenalties = 0;

  for (const rule of tensionRules) {
    if (rule.when(enrichedA, enrichedB)) {
      tensions.push({
        id: rule.id,
        name: rule.name,
        penalty: rule.penalty,
        explain: rule.explain,
      });
      sumPenalties += rule.penalty;
    }
  }

  const friction = Math.max(0, Math.min(10, sumPenalties));
  return { friction, tensions };
}
