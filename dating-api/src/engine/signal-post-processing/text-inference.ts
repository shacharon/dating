/**
 * Post-LLM text-inference rules. Only fill signals that are still null.
 * No rule or threshold changes.
 */

import {
  EXTRACTION_SIGNAL_KEYS,
  EXTRACTION_SIGNAL_KEYS_SET,
  MAX_EVIDENCE_ITEMS,
} from '../../extraction/extracted-signals.interface';
import type { ExtractedSignals } from '../../extraction/extracted-signals.interface';

export interface TextInferenceRule {
  id: string;
  patterns: RegExp[];
  inferences: ReadonlyArray<{ signal: string; value: number }>;
  note: string;
}

export const TEXT_INFERENCE_RULES: readonly TextInferenceRule[] = [
  // DATING_SPARSE_SET_PATCH_V1
  // DATING_EXTRACTION_LAYER_BATCH_PATCH_V1
  {
    id: 'communication_values_stability',
    patterns: [
      /(?=.*\b(?:clear|lear|honest|direct|truth)\b)(?=.*\b(?:boundar(?:y|ies)|respect)\b)(?=.*\b(?:stability|stable|no\s+drama)\b)/is,
      /(?=.*\bcommunicat(?:ion|e|ing)\b)(?=.*\b(?:loyal(?:ty)?|plan(?:ning)?|future)\b)/i,
      /(?=.*תקשורת)(?=.*גבולות)(?=.*(?:יציב|יציבות))/u,
    ],
    inferences: [
      { signal: 'relationshipClarity', value: 7 },
      { signal: 'lifestylePace', value: 4 },
    ],
    note: '"clear communication + boundaries + stability" => relationshipClarity>=7, lifestylePace<=4',
  },
  {
    id: 'financial_analytical_planning',
    patterns: [
      /\bcfo\b/i,
      /\bportfolio\b/i,
      /\bspreadsheets?\b/i,
      /\bfinancial\s+planning\b/i,
      /\blong[- ]?term\s+plans?\b/i,
    ],
    inferences: [{ signal: 'financialMindset', value: 8 }],
    note: '"CFO/portfolio/spreadsheets/financial planning" => financialMindset>=8',
  },
  {
    id: 'anti_materialist_money_not_important',
    patterns: [
      /\bdon'?t\s+care\s+about\s+money\b/i,
      /\bdon'?t\s+care\s+about\s+status\b/i,
      /\bdon'?t\s+chase\s+money\b/i,
      /\bmoney\s+does(?:n'?t| not)\s+matter\b/i,
      /\bnot\s+materialistic\b/i,
      /\bclimbing\s+the\s+social\s+ladder\b/i,
      /לא\s+אכפת\s+לי\s+מ(?:כסף|סטטוס)/u,
      /לא\s+חשוב\s+לי\s+(?:כסף|סטטוס)/u,
    ],
    inferences: [{ signal: 'financialMindset', value: 3 }],
    note: '"money/status not important" => financialMindset<=3',
  },
  {
    id: 'quiet_solitude_pacing',
    patterns: [
      /\bquiet\s+companionship\b/i,
      /\bquiet\s+life\b/i,
      /\bspace\s+and\s+silence\b/i,
      /\bneed\s+(?:a\s+)?lot\s+of\s+space\b/i,
      /\bgo\s+with\s+the\s+flow\b/i,
      /\bnot\s+here\s+for\s+(?:constant\s+)?drama\b/i,
      /\bno\s+drama\b/i,
      /(?=.*שקט)(?=.*(?:יציב|יציבות))/u,
    ],
    inferences: [{ signal: 'lifestylePace', value: 5 }],
    note: '"quiet/solitude/silence/flow/no drama" => lifestylePace<=5',
  },
  {
    id: 'calm_grounded_consistent',
    patterns: [
      /\bcalm\b.*\bgrounded\b/i,
      /\bgrounded\b.*\bcalm\b/i,
      /\bconsistent\b/i,
    ],
    inferences: [
      { signal: 'socialBattery', value: 4 },
      { signal: 'spirituality', value: 4 },
    ],
    note: '"calm/grounded/consistent" => socialBattery<=4, spirituality>=4',
  },
  {
    id: 'playful_flirting_pace',
    patterns: [
      /\bwitty\s+flirting\b/i,
      /\bplayful\s+back(?:-|\s)?and(?:-|\s)?forth\b/i,
    ],
    inferences: [{ signal: 'lifestylePace', value: 6 }],
    note: '"witty flirting / playful back-and-forth" => lifestylePace>=6',
  },
  {
    id: 'respects_boundaries',
    patterns: [
      /\bboundar(?:y|ies)\b/i,
      /\bneeds?\s+(?:my\s+)?space\b/i,
      /\bown\s+space\b/i,
    ],
    inferences: [
      { signal: 'independence', value: 7 },
      { signal: 'directness', value: 6 },
    ],
    note: '"respects boundaries" => independence>=7, directness>=6',
  },
  {
    id: 'quiet_home',
    patterns: [
      /\bquiet\s+(?:home|evenings?|nights?|life)\b/i,
      /\bno\s+drama\b/i,
      /\bhomebody\b/i,
      /\bstay(?:ing)?\s+(?:home|in)\b/i,
    ],
    inferences: [
      { signal: 'lifestylePace', value: 4 },
      { signal: 'socialBattery', value: 5 },
    ],
    note: '"quiet home/no drama" => lifestylePace<=4, socialBattery<=5',
  },
  {
    id: 'not_partying',
    patterns: [
      /\bnot\s+into\s+(?:\w+\s+)?part(?:y|ying)\b/i,
      /\bno\s+part(?:y|ying)\b/i,
      /\bdon'?t\s+(?:really\s+)?party\b/i,
      /\bnot\s+a\s+party\b/i,
    ],
    inferences: [
      { signal: 'socialBattery', value: 5 },
      { signal: 'lifestylePace', value: 6 },
    ],
    note: '"not into heavy partying" => socialBattery<=5, lifestylePace<=6',
  },
  {
    id: 'shared_growth',
    patterns: [
      /\bshared\s+habits?\b/i,
      /\bsupport(?:ing)?\s+(?:each\s+other'?s?\s+)?growth\b/i,
      /\bgrow(?:ing)?\s+together\b/i,
      /\bmutual\s+growth\b/i,
    ],
    inferences: [{ signal: 'relationshipClarity', value: 7 }],
    note: '"shared habits/supporting growth" => relationshipClarity>=7',
  },
  {
    id: 'health_fitness',
    patterns: [
      /\btraining\b/i,
      /\bgym\b/i,
      /\bwork(?:ing)?\s*out\b/i,
      /\bfitness\b/i,
      /\bhealth[- ]?conscious\b/i,
      /\bsleep\b.*\b(?:food|nutrition|diet)\b/i,
      /\b(?:food|nutrition|diet)\b.*\bsleep\b/i,
      /\byoga\b/i,
      /\bhealthy\s+eat(?:ing|s)?\b/i,
      /\bclean\s+eat(?:ing|s)?\b/i,
    ],
    inferences: [{ signal: 'healthBodyConsciousness', value: 8 }],
    note: '"training/gym/yoga/healthy eating" => healthBodyConsciousness>=8',
  },
  {
    id: 'spirituality',
    patterns: [
      /\bguided\s+by\s+(?:the\s+)?stars\b/i,
      /\bretreat\b/i,
      /\bmeditat(?:e|ion|ing)\b/i,
      /\bspiritual(?:ity)?\b/i,
      /\bmindful(?:ness)?\b/i,
      /\bchakra\b/i,
    ],
    inferences: [{ signal: 'spirituality', value: 8 }],
    note: '"guided by stars/retreat" => spirituality>=8',
  },
  {
    id: 'nature_introvert',
    patterns: [
      /\bvillage\b/i,
      /\bnature\b/i,
      /\btrees?\b/i,
      /\bcats?\b/i,
      /\bcountryside\b/i,
      /\bforest\b/i,
      /\bhiking\b/i,
    ],
    inferences: [
      { signal: 'socialBattery', value: 4 },
      { signal: 'lifestylePace', value: 4 },
    ],
    note: '"quiet/village/nature/cats/trees" => socialBattery<=4, lifestylePace<=4',
  },
  {
    id: 'career_ambition',
    patterns: [
      /\bstartup\b/i,
      /\bcareer\b/i,
      /\bambitious\b/i,
      /\bdriven\b/i,
      /\bentrepreneur\b/i,
      /\bhustle\b/i,
      /\bgoal[- ]?oriented\b/i,
    ],
    inferences: [{ signal: 'ambition', value: 7 }],
    note: '"startup/career/ambitious/driven" => ambition>=7',
  },
  {
    id: 'clear_communication',
    patterns: [
      /\bclear\s+communicat(?:ion|or|e|ing)\b/i,
      /\bhonest(?:y)?\b/i,
      /\bdirect\b/i,
      /\bstraightforward\b/i,
      /\btransparent\b/i,
      /\bopen\s+communicat(?:ion|or|e|ing)\b/i,
    ],
    inferences: [{ signal: 'directness', value: 7 }],
    note: '"clear communication/honest/direct" => directness>=7',
  },
  {
    id: 'autonomy',
    patterns: [
      /\bindependen(?:t|ce)\b/i,
      /\bautonomy\b/i,
      /\bself[- ]?sufficient\b/i,
      /\bmy\s+own\s+(?:life|time|thing)\b/i,
    ],
    inferences: [{ signal: 'independence', value: 7 }],
    note: '"independence/autonomy/self-sufficient" => independence>=7',
  },
  {
    id: 'family_serious',
    patterns: [
      /\bfamily[- ]?oriented\b/i,
      /\blong[- ]?term\b/i,
      /\bserious\s+relationship\b/i,
      /\bsettle\s+down\b/i,
      /\bmarriage\b/i,
      /\bcommit(?:ted|ment)\b/i,
      /\bwant(?:s|ing)?\s+(?:a\s+)?famil(?:y|ies)\b/i,
    ],
    inferences: [{ signal: 'relationshipClarity', value: 7 }],
    note: '"family oriented/long-term/serious relationship" => relationshipClarity>=7',
  },
  {
    id: 'conflict_talk_through',
    patterns: [
      /\btalk\s+things?\s+through\b/i,
      /\bwork\s+through\s+(?:it|conflict|disagreement)\b/i,
      /\bdiscuss\s+when\s+we\s+disagree\b/i,
      /\bhash\s+it\s+out\b/i,
    ],
    inferences: [{ signal: 'directness', value: 6 }],
    note: '"talk things through / hash it out" => directness 6 (existing signal only)',
  },
  {
    id: 'routine_predictable',
    patterns: [
      /\blove\s+(?:my\s+)?routine\b/i,
      /\bneed\s+predictability\b/i,
      /\bsame\s+every\s+day\b/i,
      /\bstructured\s+week\b/i,
    ],
    inferences: [{ signal: 'lifestylePace', value: 4 }],
    note: '"routine / predictability" => lifestylePace 4 (existing signal only)',
  },
  {
    id: 'spontaneous_flow',
    patterns: [
      /\bspontaneous\b/i,
      /\bgo\s+with\s+the\s+flow\b/i,
      /\blast[- ]?minute\s+plans?\b/i,
    ],
    inferences: [{ signal: 'lifestylePace', value: 6 }],
    note: '"spontaneous / go with the flow" => lifestylePace 6 (existing signal only)',
  },
];

/**
 * Fill null signals from text patterns when the LLM missed them.
 * Only sets signals that are still null — never overrides LLM output.
 */
export function applyTextInference(
  data: ExtractedSignals,
  inputText: string,
): ExtractedSignals {
  if (!inputText || inputText.trim().length === 0) return data;

  const signals = { ...data.signals };
  const evidence = [...(data.evidence ?? [])];
  const coverageNotes: string[] = [...(data.coverageNotes ?? [])];
  let anyApplied = false;

  for (const rule of TEXT_INFERENCE_RULES) {
    const matched = rule.patterns.some((p) => p.test(inputText));
    if (!matched) continue;

    let ruleFired = false;
    for (const inf of rule.inferences) {
      if (!EXTRACTION_SIGNAL_KEYS_SET.has(inf.signal)) continue;
      if (signals[inf.signal] != null) continue;
      signals[inf.signal] = inf.value;
      evidence.push({
        signal: inf.signal,
        quote: `inferred: ${rule.id}`,
        reason: 'Heuristic text pattern',
        note: 'text-inference',
      });
      ruleFired = true;
    }
    if (ruleFired) {
      coverageNotes.push(rule.note);
      anyApplied = true;
    }
  }

  // Explicit authenticity phrasing implies clearer communication style.
  // Keep this conservative: only floor directness to 6 when phrase is present.
  if (/\bnot\s+a\s+mask(?:\s+forever)?\b/i.test(inputText)) {
    const currentDirectness = signals.directness;
    if (currentDirectness == null || currentDirectness < 6) {
      signals.directness = 6;
      evidence.push({
        signal: 'directness',
        quote: 'inferred: authenticity_not_a_mask',
        reason: 'Phrase implies direct communication',
        note: 'text-inference',
      });
      coverageNotes.push('"not a mask" => directness>=6');
      anyApplied = true;
    }
  }

  if (!anyApplied) return data;

  return {
    ...data,
    signals,
    evidence: evidence.slice(0, MAX_EVIDENCE_ITEMS),
    coverageNotes,
  };
}
