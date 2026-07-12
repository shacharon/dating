/**
 * Tension matrix rules for the dating match engine.
 * Each rule has a predicate (when) and a penalty; when the predicate holds, the tension is applied.
 */

export interface EnrichedSignals {
  ambition?: number | null;
  socialBattery?: number | null;
  healthBodyConsciousness?: number | null;
  emotionalDepth?: number | null;
  attachmentSecurity?: number | null;
  directness?: number | null;
  independence?: number | null;
  traditionalism?: number | null;
  financialMindset?: number | null;
  relationshipClarity?: number | null;
  spirituality?: number | null;
  lifestylePace?: number | null;
  physicalPriority?: number | null;
  statusOrientation?: number | null;
  /** Derived from keywords (e.g. "one soul", "shared bank accounts"). */
  fusionNeed?: number | null;
  /** Derived from keywords (e.g. "boundaries", "needs space"). */
  boundariesNeed?: number | null;
}

export function getSignal(
  s: EnrichedSignals,
  key: keyof EnrichedSignals,
): number | null {
  const v = s[key];
  if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
  return v;
}

export function num(x: number | null | undefined): number {
  if (x == null || typeof x !== 'number' || !Number.isFinite(x)) return 0;
  return x;
}

export interface TensionRule {
  id: string;
  name: string;
  when: (a: EnrichedSignals, b: EnrichedSignals) => boolean;
  penalty: number;
  explain: string;
}

export const tensionRules: TensionRule[] = [
  {
    id: 'stability_vs_nomadism',
    name: 'Stability need vs nomadism (HIGH)',
    when: (a, b) => {
      const aStability = num(getSignal(a, 'traditionalism'));
      const aNomad = num(getSignal(a, 'lifestylePace'));
      const bStability = num(getSignal(b, 'traditionalism'));
      const bNomad = num(getSignal(b, 'lifestylePace'));
      return (
        (aStability >= 7 && bNomad >= 7) || (bStability >= 7 && aNomad >= 7)
      );
    },
    penalty: 4,
    explain:
      'One seeks stability (traditionalism >= 7), the other high mobility/nomadism (lifestylePace >= 7).',
  },
  {
    id: 'emotional_depth_gap',
    name: 'Emotional depth gap (MED)',
    when: (a, b) => {
      const aEmo = getSignal(a, 'emotionalDepth');
      const bEmo = getSignal(b, 'emotionalDepth');
      if (aEmo == null || bEmo == null) return false;
      return Math.abs(aEmo - bEmo) >= 4;
    },
    penalty: 3,
    explain: 'Meaningful gap in emotional depth (>= 4).',
  },
  {
    id: 'both_low_attachment',
    name: 'Both low attachment security (LOW)',
    when: (a, b) => {
      const aAtt = getSignal(a, 'attachmentSecurity');
      const bAtt = getSignal(b, 'attachmentSecurity');
      if (aAtt == null || bAtt == null) return false;
      return aAtt <= 4 && bAtt <= 4;
    },
    penalty: 2,
    explain: 'Both partners have low attachment security (<= 4).',
  },
  {
    id: 'fusion_vs_boundaries',
    name: 'FUSION vs BOUNDARIES (HIGH)',
    when: (a, b) => {
      const aFusion = num(getSignal(a, 'fusionNeed'));
      const aBound = num(getSignal(a, 'boundariesNeed'));
      const bFusion = num(getSignal(b, 'fusionNeed'));
      const bBound = num(getSignal(b, 'boundariesNeed'));
      return (aFusion >= 7 && bBound >= 6) || (bFusion >= 7 && aBound >= 6);
    },
    penalty: 7,
    explain:
      'One seeks fusion (e.g. shared everything), the other strong boundaries (e.g. needs space).',
  },
  {
    id: 'independence_mismatch',
    name: 'Independence mismatch (HIGH)',
    when: (a, b) => {
      const aInd = getSignal(a, 'independence');
      const bInd = getSignal(b, 'independence');
      if (aInd == null || bInd == null) return false;
      return (aInd <= 2 && bInd >= 7) || (aInd >= 7 && bInd <= 2);
    },
    penalty: 6,
    explain: 'One very low independence, the other very high (or vice versa).',
  },
  {
    id: 'attachment_anxiety_vs_directness',
    name: 'Attachment anxiety vs extreme directness (MED)',
    when: (a, b) => {
      const aSec = getSignal(a, 'attachmentSecurity');
      const aDir = getSignal(a, 'directness');
      const bSec = getSignal(b, 'attachmentSecurity');
      const bDir = getSignal(b, 'directness');
      return (
        (num(aSec) <= 2 && num(bDir) >= 8) || (num(bSec) <= 2 && num(aDir) >= 8)
      );
    },
    penalty: 4,
    explain:
      'Low attachment security paired with very high directness can feel harsh.',
  },
  {
    id: 'traditional_vs_high_pace',
    name: 'Traditional vs high pace (MED)',
    when: (a, b) => {
      const aTrad = getSignal(a, 'traditionalism');
      const aPace = getSignal(a, 'lifestylePace');
      const bTrad = getSignal(b, 'traditionalism');
      const bPace = getSignal(b, 'lifestylePace');
      return (
        (num(aTrad) >= 8 && num(bPace) >= 8) ||
        (num(bTrad) >= 8 && num(aPace) >= 8)
      );
    },
    penalty: 3,
    explain: 'Very traditional values vs very fast lifestyle pace.',
  },
  {
    id: 'traditionalism_structure_gap',
    name: 'Traditional vs non-traditional structure (MED)',
    when: (a, b) => {
      const aTrad = getSignal(a, 'traditionalism');
      const bTrad = getSignal(b, 'traditionalism');
      if (aTrad == null || bTrad == null) return false;
      return Math.abs(aTrad - bTrad) >= 5;
    },
    penalty: 2,
    explain: 'Meaningful gap in traditional vs non-traditional structure.',
  },
  {
    id: 'relationship_clarity_flow_gap',
    name: 'Free-flow vs intentional/structured (MED)',
    when: (a, b) => {
      const aClarity = getSignal(a, 'relationshipClarity');
      const bClarity = getSignal(b, 'relationshipClarity');
      if (aClarity == null || bClarity == null) return false;
      return Math.abs(aClarity - bClarity) >= 5;
    },
    penalty: 2,
    explain:
      'One prefers free-flow, the other more intentional/structured relationship.',
  },
  {
    id: 'social_battery_mismatch',
    name: 'Social battery mismatch (MED)',
    when: (a, b) => {
      const aSoc = getSignal(a, 'socialBattery');
      const bSoc = getSignal(b, 'socialBattery');
      if (aSoc == null || bSoc == null) return false;
      return Math.abs(aSoc - bSoc) >= 6;
    },
    penalty: 3,
    explain: 'Large gap in social battery (introvert vs extrovert).',
  },
  {
    id: 'lifestyle_pace_mismatch',
    name: 'Lifestyle pace mismatch (MED)',
    when: (a, b) => {
      const aPace = getSignal(a, 'lifestylePace');
      const bPace = getSignal(b, 'lifestylePace');
      if (aPace == null || bPace == null) return false;
      return Math.abs(aPace - bPace) >= 5;
    },
    penalty: 2,
    explain: 'Meaningful gap in lifestyle pace (e.g. slow vs fast).',
  },
  {
    id: 'financial_mindset_mismatch',
    name: 'Financial mindset mismatch (MED)',
    when: (a, b) => {
      const aF = getSignal(a, 'financialMindset');
      const bF = getSignal(b, 'financialMindset');
      if (aF == null || bF == null) return false;
      return Math.abs(aF - bF) >= 5;
    },
    penalty: 3,
    explain: 'Meaningful difference in financial mindset.',
  },
  {
    id: 'status_orientation_mismatch',
    name: 'Status orientation mismatch (LOW)',
    when: (a, b) => {
      const aS = getSignal(a, 'statusOrientation');
      const bS = getSignal(b, 'statusOrientation');
      if (aS == null || bS == null) return false;
      return Math.abs(aS - bS) >= 6;
    },
    penalty: 2,
    explain: 'Difference in status/material orientation.',
  },
  {
    id: 'physical_priority_mismatch',
    name: 'Physical priority mismatch (LOW)',
    when: (a, b) => {
      const aP = getSignal(a, 'physicalPriority');
      const bP = getSignal(b, 'physicalPriority');
      if (aP == null || bP == null) return false;
      return Math.abs(aP - bP) >= 6;
    },
    penalty: 2,
    explain: 'Difference in physical/attractiveness priority.',
  },
];
