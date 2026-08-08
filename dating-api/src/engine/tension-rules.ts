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
  /** Shadow Expansion-01 — from evaluationJson.self.signals when extracted. */
  empathyCompassion?: number | null;
  vulnerabilityOpenness?: number | null;
  /** Shadow Expansion-02 — from evaluationJson.self.signals when extracted. */
  emotionalRegulation?: number | null;
  physicalAffectionStyle?: number | null;
  /** Shadow Expansion-03 — from evaluationJson.self.signals when extracted. */
  humorPlayfulness?: number | null;
  /** Shadow Expansion-04 — from evaluationJson.self.signals when extracted. */
  intellectualCuriosity?: number | null;
  creativeExpression?: number | null;
  /** Shadow Expansion-05 — from evaluationJson.self.signals when extracted. */
  physicalActivityLevel?: number | null;
  domesticComfort?: number | null;
  /** Shadow Expansion-06 — from evaluationJson.self.signals when extracted. */
  adventureNovelty?: number | null;
  /** Shadow Expansion-07 — from evaluationJson.self.signals when extracted. */
  casualIntimacyIntent?: number | null;
  supportExchangeOrientation?: number | null;
  supportProviderOrientation?: number | null;
  supportRecipientOrientation?: number | null;
  religiousObservance?: number | null;
  /** Shadow Expansion-08 — from evaluationJson.self.signals when extracted. */
  educationLevel?: number | null;
  honestyIntegrity?: number | null;
  chronotype?: number | null;
  physicalTypePreference?: number | null;
  /** Shadow Expansion-10 — from evaluationJson.self.signals when extracted. */
  repairSkills?: number | null;
  forgivenessStyle?: number | null;
  /** Shadow Expansion-11 — from evaluationJson.self.signals when extracted. */
  stressResponse?: number | null;
  jealousySecurity?: number | null;
  /** Shadow Expansion-12 — from evaluationJson.self.signals when extracted. */
  listeningPresence?: number | null;
  emotionalExpression?: number | null;
  /** Shadow Expansion-13 — from evaluationJson.self.signals when extracted. */
  growthMindset?: number | null;
  selfAwareness?: number | null;
  /** Shadow Expansion-14 — from evaluationJson.self.signals when extracted. */
  patienceTolerance?: number | null;
  intimacyPacing?: number | null;
  monogamyAlignment?: number | null;
  /** Shadow Expansion-15 — from evaluationJson.self.signals when extracted. */
  familyEnmeshment?: number | null;
  friendCoupleBalance?: number | null;
  aloneTimeNeed?: number | null;
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
  {
    id: 'empathy_gap',
    name: 'Empathy mismatch (MED-HIGH)',
    when: (a, b) => {
      const aEmp = getSignal(a, 'empathyCompassion');
      const bEmp = getSignal(b, 'empathyCompassion');
      if (aEmp == null || bEmp == null) return false;
      return (aEmp >= 8 && bEmp <= 3) || (bEmp >= 8 && aEmp <= 3);
    },
    penalty: 4,
    explain:
      'One partner needs deep empathy, the other is less emotionally attuned',
  },
  {
    id: 'vulnerability_mismatch',
    name: 'Vulnerability vs walls (HIGH)',
    when: (a, b) => {
      const aVuln = getSignal(a, 'vulnerabilityOpenness');
      const bVuln = getSignal(b, 'vulnerabilityOpenness');
      if (aVuln == null || bVuln == null) return false;
      return (aVuln >= 7 && bVuln <= 3) || (bVuln >= 7 && aVuln <= 3);
    },
    penalty: 5,
    explain:
      'One partner opens up easily, the other keeps emotional walls up',
  },
  {
    id: 'emotional_volatility_gap',
    name: 'Emotional regulation mismatch (HIGH)',
    when: (a, b) => {
      const aReg = getSignal(a, 'emotionalRegulation');
      const bReg = getSignal(b, 'emotionalRegulation');
      if (aReg == null || bReg == null) return false;
      return (aReg >= 8 && bReg <= 3) || (bReg >= 8 && aReg <= 3);
    },
    penalty: 5,
    explain: 'One partner is emotionally steady, the other more reactive',
  },
  {
    id: 'affection_needs_gap',
    name: 'Physical affection mismatch (MED-HIGH)',
    when: (a, b) => {
      const aAff = getSignal(a, 'physicalAffectionStyle');
      const bAff = getSignal(b, 'physicalAffectionStyle');
      if (aAff == null || bAff == null) return false;
      return (aAff >= 8 && bAff <= 3) || (bAff >= 8 && aAff <= 3);
    },
    penalty: 4,
    explain: 'Big difference in physical affection needs',
  },
  {
    id: 'humor_mismatch',
    name: 'Playfulness mismatch (MED)',
    when: (a, b) => {
      const aHum = getSignal(a, 'humorPlayfulness');
      const bHum = getSignal(b, 'humorPlayfulness');
      if (aHum == null || bHum == null) return false;
      return (aHum >= 8 && bHum <= 3) || (bHum >= 8 && aHum <= 3);
    },
    penalty: 3,
    explain: 'One values playfulness and fun, the other is more serious',
  },
  {
    id: 'intellectual_gap',
    name: 'Intellectual stimulation gap (MED-HIGH)',
    when: (a, b) => {
      const aInt = getSignal(a, 'intellectualCuriosity');
      const bInt = getSignal(b, 'intellectualCuriosity');
      if (aInt == null || bInt == null) return false;
      return (aInt >= 8 && bInt <= 3) || (bInt >= 8 && aInt <= 3);
    },
    penalty: 4,
    explain:
      'One needs intellectual stimulation, the other is less focused on ideas',
  },
  {
    id: 'creative_mismatch',
    name: 'Creative expression mismatch (LOW-MED)',
    when: (a, b) => {
      const aCre = getSignal(a, 'creativeExpression');
      const bCre = getSignal(b, 'creativeExpression');
      if (aCre == null || bCre == null) return false;
      return (aCre >= 8 && bCre <= 2) || (bCre >= 8 && aCre <= 2);
    },
    penalty: 2,
    explain:
      'One needs creative expression, the other does not relate to that drive',
  },
  {
    id: 'activity_level_gap',
    name: 'Physical activity level gap (MED)',
    when: (a, b) => {
      const aAct = getSignal(a, 'physicalActivityLevel');
      const bAct = getSignal(b, 'physicalActivityLevel');
      if (aAct == null || bAct == null) return false;
      return (aAct >= 8 && bAct <= 3) || (bAct >= 8 && aAct <= 3);
    },
    penalty: 3,
    explain: 'Big difference in physical activity levels',
  },
  {
    id: 'domestic_out_mismatch',
    name: 'Home vs out preference (MED)',
    when: (a, b) => {
      const aDom = getSignal(a, 'domesticComfort');
      const bDom = getSignal(b, 'domesticComfort');
      if (aDom == null || bDom == null) return false;
      return (aDom >= 8 && bDom <= 3) || (bDom >= 8 && aDom <= 3);
    },
    penalty: 3,
    explain: 'One prefers cozy nights in, the other wants to be out',
  },
  {
    id: 'novelty_routine_clash',
    name: 'Novelty vs routine clash (MED-HIGH)',
    when: (a, b) => {
      const aNov = getSignal(a, 'adventureNovelty');
      const bNov = getSignal(b, 'adventureNovelty');
      if (aNov == null || bNov == null) return false;
      return (aNov >= 8 && bNov <= 3) || (bNov >= 8 && aNov <= 3);
    },
    penalty: 4,
    explain:
      'One seeks new experiences, the other values routine and familiarity',
  },
  {
    id: 'casual_intimacy_clash',
    name: 'Casual vs committed intimacy clash (HIGH)',
    when: (a, b) => {
      const aCas = getSignal(a, 'casualIntimacyIntent');
      const bCas = getSignal(b, 'casualIntimacyIntent');
      if (aCas == null || bCas == null) return false;
      return (aCas >= 8 && bCas <= 3) || (bCas >= 8 && aCas <= 3);
    },
    penalty: 6,
    explain:
      'One seeks casual physical intimacy, the other needs commitment before intimacy',
  },
  {
    id: 'support_exchange_mismatch',
    name: 'Support exchange mismatch (HIGH)',
    when: (a, b) => {
      const aSup = getSignal(a, 'supportExchangeOrientation');
      const bSup = getSignal(b, 'supportExchangeOrientation');
      if (aSup == null || bSup == null) return false;
      return (aSup >= 8 && bSup <= 3) || (bSup >= 8 && aSup <= 3);
    },
    penalty: 6,
    explain:
      'One seeks a support/arrangement dynamic, the other wants a non-transactional relationship',
  },
  {
    id: 'support_both_provider',
    name: 'Both want to provide support (MED)',
    when: (a, b) => {
      const aEx = getSignal(a, 'supportExchangeOrientation');
      const bEx = getSignal(b, 'supportExchangeOrientation');
      const aProv = getSignal(a, 'supportProviderOrientation');
      const bProv = getSignal(b, 'supportProviderOrientation');
      if (aEx == null || bEx == null || aProv == null || bProv == null)
        return false;
      if (aEx < 7 || bEx < 7) return false; // only when both open to exchange
      return aProv >= 7 && bProv >= 7;
    },
    penalty: 4,
    explain:
      'You both want to be the one providing financial support — roles may clash',
  },
  {
    id: 'support_both_recipient',
    name: 'Both seek financial support (MED)',
    when: (a, b) => {
      const aEx = getSignal(a, 'supportExchangeOrientation');
      const bEx = getSignal(b, 'supportExchangeOrientation');
      const aRec = getSignal(a, 'supportRecipientOrientation');
      const bRec = getSignal(b, 'supportRecipientOrientation');
      if (aEx == null || bEx == null || aRec == null || bRec == null)
        return false;
      if (aEx < 7 || bEx < 7) return false;
      return aRec >= 7 && bRec >= 7;
    },
    penalty: 4,
    explain:
      'You both seek financial support from a partner — expectations may not align',
  },
  {
    id: 'religious_observance_gap',
    name: 'Religious observance gap (MED-HIGH)',
    when: (a, b) => {
      const aRel = getSignal(a, 'religiousObservance');
      const bRel = getSignal(b, 'religiousObservance');
      if (aRel == null || bRel == null) return false;
      const gap = Math.abs(aRel - bRel);
      return gap >= 6 && (aRel >= 7 || bRel >= 7);
    },
    penalty: 5,
    explain:
      'Very different levels of religious practice — may affect daily life compatibility',
  },
  {
    id: 'education_level_gap',
    name: 'Education level gap (MED)',
    when: (a, b) => {
      const aEd = getSignal(a, 'educationLevel');
      const bEd = getSignal(b, 'educationLevel');
      if (aEd == null || bEd == null) return false;
      return Math.abs(aEd - bEd) >= 5 && (aEd >= 8 || bEd >= 8);
    },
    penalty: 4,
    explain:
      'One strongly requires formal education credentials, the other does not share that priority',
  },
  {
    id: 'honesty_integrity_gap',
    name: 'Honesty / integrity mismatch (MED-HIGH)',
    when: (a, b) => {
      const aH = getSignal(a, 'honestyIntegrity');
      const bH = getSignal(b, 'honestyIntegrity');
      if (aH == null || bH == null) return false;
      return (aH >= 8 && bH <= 3) || (bH >= 8 && aH <= 3);
    },
    penalty: 5,
    explain:
      'Very different emphasis on honesty and integrity as relationship values',
  },
  {
    id: 'chronotype_clash',
    name: 'Morning vs night rhythm clash (MED)',
    when: (a, b) => {
      const aC = getSignal(a, 'chronotype');
      const bC = getSignal(b, 'chronotype');
      if (aC == null || bC == null) return false;
      return (aC >= 8 && bC <= 3) || (bC >= 8 && aC <= 3);
    },
    penalty: 3,
    explain:
      'One is a strong night owl, the other a strong early bird — daily rhythm may clash',
  },
  {
    id: 'repair_skills_gap',
    name: 'Repair skills gap (HIGH)',
    when: (a, b) => {
      const aR = getSignal(a, 'repairSkills');
      const bR = getSignal(b, 'repairSkills');
      if (aR == null || bR == null) return false;
      return (aR >= 8 && bR <= 3) || (bR >= 8 && aR <= 3);
    },
    penalty: 5,
    explain:
      'One actively repairs after conflict, the other tends to withdraw or avoid resolution',
  },
  {
    id: 'both_low_repair',
    name: 'Both low repair skills (HIGH — Gottman "stonewalling" risk)',
    when: (a, b) => {
      const aR = getSignal(a, 'repairSkills');
      const bR = getSignal(b, 'repairSkills');
      if (aR == null || bR == null) return false;
      return aR <= 3 && bR <= 3;
    },
    penalty: 6,
    explain:
      'Neither partner tends to repair after conflict — unresolved issues may accumulate',
  },
  {
    id: 'forgiveness_style_gap',
    name: 'Forgiveness style gap (MED)',
    when: (a, b) => {
      const aF = getSignal(a, 'forgivenessStyle');
      const bF = getSignal(b, 'forgivenessStyle');
      if (aF == null || bF == null) return false;
      return (aF >= 8 && bF <= 3) || (bF >= 8 && aF <= 3);
    },
    penalty: 4,
    explain:
      'One lets go of conflict quickly, the other holds onto it longer — pacing after fights may clash',
  },
  {
    id: 'stress_response_clash',
    name: 'Pursue vs withdraw under stress (HIGH — classic pursuer-distancer)',
    when: (a, b) => {
      const aS = getSignal(a, 'stressResponse');
      const bS = getSignal(b, 'stressResponse');
      if (aS == null || bS == null) return false;
      return (aS >= 8 && bS <= 3) || (bS >= 8 && aS <= 3);
    },
    penalty: 5,
    explain:
      'One seeks closeness under stress, the other needs space — can create a pursue/withdraw cycle',
  },
  {
    id: 'jealousy_security_gap',
    name: 'Jealousy vs independence clash (MED-HIGH)',
    when: (a, b) => {
      const aJ = getSignal(a, 'jealousySecurity');
      const bJ = getSignal(b, 'jealousySecurity');
      if (aJ == null || bJ == null) return false;
      return (aJ >= 8 && bJ <= 3) || (bJ >= 8 && aJ <= 3);
    },
    penalty: 5,
    explain:
      'One tends toward jealousy/reassurance-seeking, the other values high independence and trust without check-ins',
  },
  {
    id: 'both_high_jealousy',
    name: 'Both high jealousy (MED)',
    when: (a, b) => {
      const aJ = getSignal(a, 'jealousySecurity');
      const bJ = getSignal(b, 'jealousySecurity');
      if (aJ == null || bJ == null) return false;
      return aJ >= 8 && bJ >= 8;
    },
    penalty: 3,
    explain:
      'Both partners lean jealous/possessive — may amplify insecurity dynamics',
  },
  {
    id: 'listening_presence_gap',
    name: 'Listening presence gap (MED-HIGH)',
    when: (a, b) => {
      const aL = getSignal(a, 'listeningPresence');
      const bL = getSignal(b, 'listeningPresence');
      if (aL == null || bL == null) return false;
      return (aL >= 8 && bL <= 3) || (bL >= 8 && aL <= 3);
    },
    penalty: 4,
    explain:
      'One partner is highly attentive, the other may seem distracted — mismatch in feeling heard',
  },
  {
    id: 'emotional_expression_gap',
    name: 'Emotional expression gap (MED — "unmet expression" risk)',
    when: (a, b) => {
      const aE = getSignal(a, 'emotionalExpression');
      const bE = getSignal(b, 'emotionalExpression');
      if (aE == null || bE == null) return false;
      return (aE >= 8 && bE <= 3) || (bE >= 8 && aE <= 3);
    },
    penalty: 4,
    explain:
      'One partner expresses feelings openly and often, the other is more reserved — may feel unreciprocated',
  },
  {
    id: 'growth_mindset_gap',
    name: 'Growth mindset gap (MED)',
    when: (a, b) => {
      const aG = getSignal(a, 'growthMindset');
      const bG = getSignal(b, 'growthMindset');
      if (aG == null || bG == null) return false;
      return (aG >= 8 && bG <= 3) || (bG >= 8 && aG <= 3);
    },
    penalty: 4,
    explain:
      'One is highly open to feedback and change, the other more fixed — growth pace may differ',
  },
  {
    id: 'both_low_self_awareness',
    name: 'Both low self-awareness (MED)',
    when: (a, b) => {
      const aS = getSignal(a, 'selfAwareness');
      const bS = getSignal(b, 'selfAwareness');
      if (aS == null || bS == null) return false;
      return aS <= 3 && bS <= 3;
    },
    penalty: 3,
    explain:
      'Neither partner shows strong self-insight — patterns may be harder to name and resolve together',
  },
  {
    id: 'patience_tolerance_gap',
    name: 'Patience/tolerance gap (MED)',
    when: (a, b) => {
      const aP = getSignal(a, 'patienceTolerance');
      const bP = getSignal(b, 'patienceTolerance');
      if (aP == null || bP == null) return false;
      return (aP >= 8 && bP <= 3) || (bP >= 8 && aP <= 3);
    },
    penalty: 3,
    explain:
      'One is highly tolerant of quirks and flaws, the other more critical — daily friction likely',
  },
  {
    id: 'intimacy_pacing_clash',
    name: 'Intimacy pacing clash (MED-HIGH)',
    when: (a, b) => {
      const aI = getSignal(a, 'intimacyPacing');
      const bI = getSignal(b, 'intimacyPacing');
      if (aI == null || bI == null) return false;
      return (aI >= 8 && bI <= 3) || (bI >= 8 && aI <= 3);
    },
    penalty: 4,
    explain:
      'One moves quickly toward closeness, the other prefers to take things slow',
  },
  {
    id: 'monogamy_alignment_mismatch',
    name: 'Monogamy alignment mismatch (HIGH — structural dealbreaker territory)',
    when: (a, b) => {
      const aM = getSignal(a, 'monogamyAlignment');
      const bM = getSignal(b, 'monogamyAlignment');
      if (aM == null || bM == null) return false;
      return (aM <= 2 && bM >= 8) || (bM <= 2 && aM >= 8);
    },
    penalty: 8,
    explain:
      'One expects strict exclusivity, the other seeks an open/non-monogamous structure',
  },
  {
    id: 'family_enmeshment_gap',
    name: 'Family enmeshment gap (MED-HIGH)',
    when: (a, b) => {
      const aF = getSignal(a, 'familyEnmeshment');
      const bF = getSignal(b, 'familyEnmeshment');
      if (aF == null || bF == null) return false;
      return (aF >= 8 && bF <= 3) || (bF >= 8 && aF <= 3);
    },
    penalty: 4,
    explain:
      'One is very close/involved with family decisions, the other more independent — boundary expectations may clash',
  },
  {
    id: 'friend_couple_balance_gap',
    name: 'Friend vs couple time gap (MED)',
    when: (a, b) => {
      const aB = getSignal(a, 'friendCoupleBalance');
      const bB = getSignal(b, 'friendCoupleBalance');
      if (aB == null || bB == null) return false;
      return (aB >= 8 && bB <= 3) || (bB >= 8 && aB <= 3);
    },
    penalty: 3,
    explain:
      'One prioritizes couple time heavily, the other prioritizes friends — time allocation may cause friction',
  },
  {
    id: 'alone_time_need_gap',
    name: 'Alone time need gap (MED)',
    when: (a, b) => {
      const aA = getSignal(a, 'aloneTimeNeed');
      const bA = getSignal(b, 'aloneTimeNeed');
      if (aA == null || bA == null) return false;
      return (aA >= 8 && bA <= 3) || (bA >= 8 && aA <= 3);
    },
    penalty: 3,
    explain:
      'One needs significant solo recharge time, the other prefers constant togetherness',
  },
];
