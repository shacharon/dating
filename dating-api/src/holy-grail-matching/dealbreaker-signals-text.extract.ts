/**
 * Deterministic dealbreaker/requirement classifier from free-text profile fields.
 * Partner-preference → DealbreakerSignal; first-person self-trait → SelfFactHint only.
 * No LLM, no network, sparse output, closed vocabulary.
 *
 * Sprint 52 keyword engine: hg-dealbreaker-text
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN (Sprint 52 Story 02)
 * See docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 */

import { applyDealbreakerGuardrails } from './dealbreaker-guardrails';
import {
  DEALBREAKER_TAXONOMY_VERSION,
  type DealbreakerClassification,
  type DealbreakerTag,
} from './dealbreaker-taxonomy';
import { escapeRegExp, isNegatedBefore } from '../shared/text-match.utils';

export { isNegatedBefore };

export type EmittedDealbreakerClassification = Exclude<
  DealbreakerClassification,
  'NEUTRAL'
>;

export interface DealbreakerSignal {
  readonly tag: DealbreakerTag;
  readonly classification: EmittedDealbreakerClassification;
  readonly evidence: string;
  readonly confidence: number;
}

export type DealbreakerSignalsTextExtraction = {
  readonly version: typeof DEALBREAKER_TAXONOMY_VERSION;
  readonly signals: readonly DealbreakerSignal[];
};

export type SelfFactHintField =
  | 'smokingFrequency'
  | 'alcoholUse'
  | 'childrenStatus'
  | 'wantsChildren'
  | 'religion';

export type SelfFactHint = {
  readonly field: SelfFactHintField;
  readonly value: string;
  readonly evidence: string;
  readonly confidence: number;
};

type FreeTextInput = {
  readonly aboutMe?: string | null;
  readonly aboutPartner?: string | null;
  readonly aboutRelationship?: string | null;
};

type PolarityHit = {
  readonly classification: EmittedDealbreakerClassification;
  readonly evidence: string;
  readonly confidence: number;
};

type TopicFamily = {
  readonly emitTag: DealbreakerTag;
  readonly hardExclude: readonly { readonly re: RegExp; readonly label: string }[];
  readonly hardRequire: readonly { readonly re: RegExp; readonly label: string }[];
  readonly soft: readonly { readonly re: RegExp; readonly label: string }[];
  /** Values/social: no HARD_REQUIRE. */
  readonly excludeOnly?: boolean;
};

function joinFields(input: FreeTextInput): string {
  return [input.aboutMe, input.aboutPartner, input.aboutRelationship]
    .map((s) => (typeof s === 'string' ? s : ''))
    .join('\n')
    .trim();
}

function firstPhraseHit(
  lower: string,
  phrases: readonly { readonly re: RegExp; readonly label: string }[],
): { label: string; index: number } | null {
  for (const { re, label } of phrases) {
    const r = new RegExp(
      re.source,
      re.flags.includes('g') ? re.flags : `${re.flags}g`,
    );
    let m: RegExpExecArray | null;
    while ((m = r.exec(lower)) !== null) {
      if (!isNegatedBefore(lower, m.index)) {
        return { label, index: m.index };
      }
    }
  }
  return null;
}

function classifyFamily(lower: string, family: TopicFamily): PolarityHit | null {
  const hardEx = firstPhraseHit(lower, family.hardExclude);
  if (hardEx) {
    return {
      classification: 'HARD_EXCLUDE',
      evidence: hardEx.label,
      confidence: 0.95,
    };
  }

  if (!family.excludeOnly) {
    const hardReq = firstPhraseHit(lower, family.hardRequire);
    if (hardReq) {
      return {
        classification: 'HARD_REQUIRE',
        evidence: hardReq.label,
        confidence: 0.95,
      };
    }
  }

  const soft = firstPhraseHit(lower, family.soft);
  if (soft) {
    return {
      classification: 'SOFT',
      evidence: soft.label,
      confidence: 0.65,
    };
  }

  // Topic mention without polarity → NEUTRAL (omit). Self-facts handled separately.
  return null;
}

const SMOKING_FAMILY: TopicFamily = {
  emitTag: 'smoking',
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?smokers?\b/i,
      label: "don't want smokers",
    },
    {
      re: /\bwon'?t\s+date\s+smokers?\b/i,
      label: "won't date smokers",
    },
    { re: /\bno\s+smokers?\b/i, label: 'no smokers' },
    {
      re: /\bnever\s+date\s+smokers?\b/i,
      label: 'never date smokers',
    },
    {
      re: /\bsmoking\b.{0,40}\bdealbreaker\b|\bdealbreaker\b.{0,40}\bsmok/i,
      label: 'smoking dealbreaker',
    },
    {
      re: /\bonly\s+non[-\s]?smokers?\b/i,
      label: 'only non-smokers',
    },
    {
      re: /\bmust\s+be\s+(?:a\s+)?non[-\s]?smoker\b/i,
      label: 'must be a non-smoker',
    },
  ],
  hardRequire: [
    { re: /\bonly\s+smokers?\b/i, label: 'only smokers' },
    {
      re: /\bmust\s+be\s+(?:a\s+)?smoker\b/i,
      label: 'must be a smoker',
    },
    {
      re: /\bnon[-\s]?negotiable[:\s]+(?:a\s+)?smoker/i,
      label: 'non-negotiable: smoker',
    },
  ],
  soft: [
    {
      re: /\bdon'?t\s+care\s+about\s+smoking\b/i,
      label: "don't care about smoking",
    },
    {
      re: /\bdoesn'?t\s+matter\s+(?:if\s+)?(?:they\s+)?smok/i,
      label: "doesn't matter if they smoke",
    },
    {
      re: /\bprefer\s+not\s+(?:to\s+date\s+)?smokers?\b/i,
      label: 'prefer not smokers',
    },
    {
      re: /\bnot\s+a\s+huge\s+fan\s+of\s+smoking\b/i,
      label: 'not a huge fan of smoking',
    },
  ],
};

const DRUGS_FAMILY: TopicFamily = {
  emitTag: 'drugs',
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?(?:drug\s+users?|people\s+who\s+(?:do|use)\s+drugs)\b/i,
      label: "don't want drug users",
    },
    { re: /\bno\s+drugs?\b/i, label: 'no drugs' },
    {
      re: /\bwon'?t\s+date\s+(?:anyone\s+who\s+)?(?:does\s+)?drugs?\b/i,
      label: "won't date drugs",
    },
    {
      re: /\bdrugs?\b.{0,40}\bdealbreaker\b|\bdealbreaker\b.{0,40}\bdrugs?\b/i,
      label: 'drugs dealbreaker',
    },
  ],
  hardRequire: [
    {
      re: /\bonly\s+(?:date\s+)?(?:people\s+who\s+)?(?:do|use)\s+drugs\b/i,
      label: 'only people who use drugs',
    },
    {
      re: /\bmust\s+(?:do|use)\s+drugs\b/i,
      label: 'must use drugs',
    },
  ],
  soft: [
    {
      re: /\bdon'?t\s+care\s+about\s+drugs?\b/i,
      label: "don't care about drugs",
    },
    {
      re: /\bprefer\s+not\s+(?:to\s+date\s+)?(?:people\s+who\s+use\s+)?drugs?\b/i,
      label: 'prefer not drugs',
    },
  ],
};

const DRINKING_FAMILY: TopicFamily = {
  emitTag: 'excessive_drinking',
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?(?:heavy\s+)?drinkers?\b/i,
      label: "don't want drinkers",
    },
    {
      re: /\bno\s+(?:heavy\s+)?drinkers?\b/i,
      label: 'no drinkers',
    },
    {
      re: /\bwon'?t\s+date\s+(?:heavy\s+)?drinkers?\b/i,
      label: "won't date drinkers",
    },
    {
      re: /\bonly\s+non[-\s]?drinkers?\b/i,
      label: 'only non-drinkers',
    },
    {
      re: /\bexcessive\s+drink(?:ing|ers?)\b.{0,40}\bdealbreaker\b|\bdealbreaker\b.{0,40}\bdrink/i,
      label: 'drinking dealbreaker',
    },
  ],
  hardRequire: [
    {
      re: /\bonly\s+(?:heavy\s+)?drinkers?\b/i,
      label: 'only drinkers',
    },
    {
      re: /\bmust\s+be\s+(?:a\s+)?(?:heavy\s+)?drinker\b/i,
      label: 'must be a drinker',
    },
  ],
  soft: [
    {
      re: /\bdon'?t\s+care\s+about\s+(?:drinking|alcohol)\b/i,
      label: "don't care about drinking",
    },
    {
      re: /\bprefer\s+not\s+(?:to\s+date\s+)?(?:heavy\s+)?drinkers?\b/i,
      label: 'prefer not drinkers',
    },
  ],
};

const VAPING_FAMILY: TopicFamily = {
  emitTag: 'vaping',
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?vap(?:ers?|ing)\b/i,
      label: "don't want vapers",
    },
    { re: /\bno\s+vap(?:ers?|ing)\b/i, label: 'no vaping' },
    {
      re: /\bonly\s+non[-\s]?vap(?:ers?|ing)\b/i,
      label: 'only non-vapers',
    },
    {
      re: /\bvap(?:e|ing)\b.{0,40}\bdealbreaker\b|\bdealbreaker\b.{0,40}\bvap/i,
      label: 'vaping dealbreaker',
    },
  ],
  hardRequire: [
    { re: /\bonly\s+vap(?:ers?|ing)\b/i, label: 'only vapers' },
    {
      re: /\bmust\s+(?:be\s+(?:a\s+)?vaper|vape)\b/i,
      label: 'must vape',
    },
  ],
  soft: [
    {
      re: /\bdon'?t\s+care\s+about\s+vap(?:e|ing)\b/i,
      label: "don't care about vaping",
    },
    {
      re: /\bprefer\s+not\s+(?:to\s+date\s+)?vap(?:ers?|ing)\b/i,
      label: 'prefer not vaping',
    },
  ],
};

const NO_KIDS_FAMILY: TopicFamily = {
  emitTag: 'no_kids',
  // Partner-directed only — bare "I don't want kids" is a self-fact (wantsChildren), not a DealbreakerSignal.
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?(?:anyone|someone|a\s+partner)\s+with\s+(?:kids?|children)\b/i,
      label: "don't want someone with kids",
    },
    {
      re: /\b(?<!have\s)no\s+(?:partners?\s+with\s+)?(?:kids?|children)\b/i,
      label: 'no kids',
    },
    {
      re: /\bwon'?t\s+date\s+(?:anyone\s+with\s+)?(?:kids?|children)\b/i,
      label: "won't date with kids",
    },
    {
      re: /\b(?:kids?|children)\b.{0,40}\bdealbreaker\b/i,
      label: 'kids dealbreaker',
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+not\s+to\s+date\s+(?:anyone\s+with\s+)?(?:kids?|children)\b/i,
      label: 'prefer not to date with kids',
    },
    {
      re: /\bdon'?t\s+care\s+(?:about|either\s+way\s+(?:on|about))\s+(?:kids?|children)\b/i,
      label: "don't care about kids",
    },
  ],
};

const KIDS_REQUIRED_FAMILY: TopicFamily = {
  emitTag: 'kids_required',
  hardExclude: [],
  hardRequire: [
    {
      re: /\bmust\s+want\s+(?:kids?|children)\b/i,
      label: 'must want kids',
    },
    {
      re: /\bonly\s+(?:date\s+)?(?:people\s+who\s+want\s+)?(?:kids?|children)\b/i,
      label: 'only people who want kids',
    },
    {
      re: /\bnon[-\s]?negotiable[:\s]+(?:want(?:s|ing)?\s+)?(?:kids?|children)/i,
      label: 'non-negotiable: kids',
    },
  ],
  soft: [
    {
      re: /\bwould\s+be\s+nice\s+if\s+(?:they\s+)?want(?:ed)?\s+(?:kids?|children)\b/i,
      label: 'would be nice if they want kids',
    },
  ],
};

const NO_PETS_FAMILY: TopicFamily = {
  emitTag: 'no_pets',
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:pets?|dogs?|cats?)\b/i,
      label: "don't want pets",
    },
    { re: /\bno\s+pets?\b/i, label: 'no pets' },
    {
      re: /\bwon'?t\s+date\s+(?:anyone\s+with\s+)?pets?\b/i,
      label: "won't date with pets",
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+not\s+(?:to\s+have\s+)?pets?\b/i,
      label: 'prefer not pets',
    },
    {
      re: /\bdon'?t\s+care\s+about\s+pets?\b/i,
      label: "don't care about pets",
    },
  ],
};

const PETS_REQUIRED_FAMILY: TopicFamily = {
  emitTag: 'pets_required',
  hardExclude: [],
  hardRequire: [
    {
      re: /\bmust\s+(?:have|love)\s+(?:pets?|dogs?|cats?)\b/i,
      label: 'must have pets',
    },
    {
      re: /\bonly\s+(?:date\s+)?(?:people\s+with\s+)?(?:pets?|dogs?|cats?)\b/i,
      label: 'only people with pets',
    },
  ],
  soft: [
    {
      re: /\bwould\s+be\s+nice\s+if\s+(?:they\s+had\s+)?(?:pets?|a\s+dog|a\s+cat)\b/i,
      label: 'would be nice if pets',
    },
  ],
};

const NO_REMOTE_FAMILY: TopicFamily = {
  emitTag: 'no_remote_work',
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:someone\s+who\s+)?(?:does\s+)?remote\s+work\b/i,
      label: "don't want remote work",
    },
    {
      re: /\bno\s+remote\s+work\b/i,
      label: 'no remote work',
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+not\s+(?:dating\s+)?(?:someone\s+)?(?:in\s+)?remote\s+work\b/i,
      label: 'prefer not remote work',
    },
  ],
};

const MUST_BE_LOCAL_FAMILY: TopicFamily = {
  emitTag: 'must_be_local',
  hardExclude: [],
  hardRequire: [
    {
      re: /\bmust\s+be\s+local\b/i,
      label: 'must be local',
    },
    {
      re: /\bonly\s+(?:date\s+)?(?:people\s+)?(?:who\s+are\s+)?local\b/i,
      label: 'only local',
    },
    {
      re: /\bnon[-\s]?negotiable[:\s]+local/i,
      label: 'non-negotiable: local',
    },
  ],
  soft: [
    {
      re: /\bprefer\s+(?:someone\s+)?local\b/i,
      label: 'prefer local',
    },
    {
      re: /\bwould\s+be\s+nice\s+if\s+(?:they\s+were\s+)?local\b/i,
      label: 'would be nice if local',
    },
  ],
};

const LONG_DISTANCE_FAMILY: TopicFamily = {
  emitTag: 'long_distance_impossible',
  hardExclude: [
    {
      re: /\bno\s+long[-\s]?distance\b/i,
      label: 'no long distance',
    },
    {
      re: /\blong[-\s]?distance\b.{0,40}\b(?:impossible|dealbreaker)\b/i,
      label: 'long distance impossible',
    },
    {
      re: /\bwon'?t\s+do\s+long[-\s]?distance\b/i,
      label: "won't do long distance",
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+not\s+(?:to\s+do\s+)?long[-\s]?distance\b/i,
      label: 'prefer not long distance',
    },
  ],
};

const POLITICAL_FAMILY: TopicFamily = {
  emitTag: 'political_incompatibility',
  excludeOnly: true,
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?(?:someone\s+)?(?:with\s+)?(?:different\s+)?politic/i,
      label: "don't want political mismatch",
    },
    {
      re: /\bpolitic(?:s|al)\b.{0,40}\bdealbreaker\b|\bdealbreaker\b.{0,40}\bpolitic/i,
      label: 'politics dealbreaker',
    },
    {
      re: /\bno\s+(?:extreme\s+)?politic/i,
      label: 'no politics',
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+(?:similar\s+)?politic/i,
      label: 'prefer similar politics',
    },
    {
      re: /\bdon'?t\s+care\s+about\s+politic/i,
      label: "don't care about politics",
    },
  ],
};

const RELIGIOUS_FAMILY: TopicFamily = {
  emitTag: 'religious_incompatibility',
  excludeOnly: true,
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?(?:someone\s+)?(?:religious|with\s+different\s+religion)/i,
      label: "don't want religious mismatch",
    },
    {
      re: /\breligio(?:n|us)\b.{0,40}\bdealbreaker\b|\bdealbreaker\b.{0,40}\breligio/i,
      label: 'religion dealbreaker',
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+(?:similar\s+)?religio/i,
      label: 'prefer similar religion',
    },
    {
      re: /\bdon'?t\s+care\s+about\s+religio/i,
      label: "don't care about religion",
    },
  ],
};

const MORAL_FAMILY: TopicFamily = {
  emitTag: 'moral_incompatibility',
  excludeOnly: true,
  hardExclude: [
    {
      re: /\b(?:i\s+)?don'?t\s+want\s+(?:to\s+date\s+)?(?:someone\s+with\s+)?(?:different\s+)?(?:morals?|values)\b/i,
      label: "don't want moral mismatch",
    },
    {
      re: /\b(?:morals?|values)\b.{0,40}\bdealbreaker\b/i,
      label: 'morals dealbreaker',
    },
  ],
  hardRequire: [],
  soft: [
    {
      re: /\bprefer\s+(?:similar\s+)?(?:morals?|values)\b/i,
      label: 'prefer similar morals',
    },
  ],
};

function socialExcludeFamily(
  tag: DealbreakerTag,
  topicWords: readonly string[],
): TopicFamily {
  const joined = topicWords.map(escapeRegExp).join('|');
  return {
    emitTag: tag,
    excludeOnly: true,
    hardExclude: [
      {
        re: new RegExp(
          `\\b(?:i\\s+)?don'?t\\s+want\\s+(?:to\\s+date\\s+)?(?:someone\\s+)?(?:who\\s+is\\s+)?(?:${joined})\\b`,
          'i',
        ),
        label: `don't want ${topicWords[0]}`,
      },
      {
        re: new RegExp(`\\bno\\s+(?:${joined})\\b`, 'i'),
        label: `no ${topicWords[0]}`,
      },
      {
        re: new RegExp(
          `\\b(?:${joined})\\b.{0,40}\\bdealbreaker\\b|\\bdealbreaker\\b.{0,40}\\b(?:${joined})\\b`,
          'i',
        ),
        label: `${topicWords[0]} dealbreaker`,
      },
    ],
    hardRequire: [],
    soft: [
      {
        re: new RegExp(
          `\\bprefer\\s+not\\s+(?:to\\s+date\\s+)?(?:someone\\s+)?(?:who\\s+is\\s+)?(?:${joined})\\b`,
          'i',
        ),
        label: `prefer not ${topicWords[0]}`,
      },
      {
        re: new RegExp(
          `\\bnot\\s+a\\s+huge\\s+fan\\s+of\\s+(?:${joined})\\b`,
          'i',
        ),
        label: `not a huge fan of ${topicWords[0]}`,
      },
    ],
  };
}

const TOPIC_FAMILIES: readonly TopicFamily[] = [
  SMOKING_FAMILY,
  DRUGS_FAMILY,
  DRINKING_FAMILY,
  VAPING_FAMILY,
  NO_KIDS_FAMILY,
  KIDS_REQUIRED_FAMILY,
  NO_PETS_FAMILY,
  PETS_REQUIRED_FAMILY,
  NO_REMOTE_FAMILY,
  MUST_BE_LOCAL_FAMILY,
  LONG_DISTANCE_FAMILY,
  POLITICAL_FAMILY,
  RELIGIOUS_FAMILY,
  MORAL_FAMILY,
  socialExcludeFamily('jealousy', ['jealous', 'jealousy']),
  socialExcludeFamily('control', ['controlling', 'control freak']),
  socialExcludeFamily('clingy', ['clingy', 'clinginess']),
  socialExcludeFamily('drama', ['drama', 'dramatic']),
  socialExcludeFamily('emotional_unavailability', [
    'emotionally unavailable',
    'emotional unavailability',
  ]),
  socialExcludeFamily('commitment_phobic', [
    'commitment phobic',
    'commitment-phobic',
    'afraid of commitment',
  ]),
];

/** First-person self-trait patterns → existing UserProfile columns. */
const SELF_FACT_PATTERNS: readonly {
  readonly re: RegExp;
  readonly field: SelfFactHintField;
  readonly value: string;
  readonly label: string;
}[] = [
  {
    re: /\bi\s+smoke\b/i,
    field: 'smokingFrequency',
    value: 'REGULAR',
    label: 'I smoke',
  },
  {
    re: /\bi(?:'?m|\s+am)\s+(?:a\s+)?smoker\b/i,
    field: 'smokingFrequency',
    value: 'REGULAR',
    label: "I'm a smoker",
  },
  {
    re: /\bi\s+(?:don't|do\s+not)\s+smoke\b/i,
    field: 'smokingFrequency',
    value: 'NEVER',
    label: "I don't smoke",
  },
  {
    re: /\bi\s+drink\b/i,
    field: 'alcoholUse',
    value: 'MODERATE',
    label: 'I drink',
  },
  {
    re: /\bi\s+(?:don't|do\s+not)\s+drink\b/i,
    field: 'alcoholUse',
    value: 'NEVER',
    label: "I don't drink",
  },
  {
    re: /\bi\s+have\s+(?:kids?|children)\b/i,
    field: 'childrenStatus',
    value: 'HAS_CHILDREN',
    label: 'I have kids',
  },
  {
    re: /\bi\s+want\s+(?:kids?|children)\b/i,
    field: 'wantsChildren',
    value: 'YES',
    label: 'I want kids',
  },
  {
    re: /\bi\s+(?:don't|do\s+not)\s+want\s+(?:kids?|children)\b/i,
    field: 'wantsChildren',
    value: 'NO',
    label: "I don't want kids",
  },
];

function dedupeSignals(
  signals: DealbreakerSignal[],
): DealbreakerSignal[] {
  const byTag = new Map<DealbreakerTag, DealbreakerSignal>();
  const rank: Record<EmittedDealbreakerClassification, number> = {
    HARD_EXCLUDE: 3,
    HARD_REQUIRE: 3,
    SOFT: 1,
  };
  for (const s of signals) {
    const prev = byTag.get(s.tag);
    if (!prev || rank[s.classification] > rank[prev.classification]) {
      byTag.set(s.tag, s);
    } else if (
      prev &&
      rank[s.classification] === rank[prev.classification] &&
      s.confidence > prev.confidence
    ) {
      byTag.set(s.tag, s);
    }
  }
  return [...byTag.values()];
}

/**
 * Partner-preference dealbreaker/requirement signals from free text.
 * Self-trait statements are excluded (see {@link extractSelfFactHintsFromFreeText}).
 * Applies {@link applyDealbreakerGuardrails} before return (confidence floor + kill switch).
 */
export function extractDealbreakerSignalsFromFreeText(
  input: FreeTextInput,
): DealbreakerSignalsTextExtraction {
  const text = joinFields(input);
  if (!text) {
    return { version: DEALBREAKER_TAXONOMY_VERSION, signals: [] };
  }
  const lower = text.toLowerCase();

  const signals: DealbreakerSignal[] = [];
  for (const family of TOPIC_FAMILIES) {
    const hit = classifyFamily(lower, family);
    if (!hit) continue;
    signals.push({
      tag: family.emitTag,
      classification: hit.classification,
      evidence: hit.evidence,
      confidence: hit.confidence,
    });
  }

  return {
    version: DEALBREAKER_TAXONOMY_VERSION,
    signals: applyDealbreakerGuardrails(dedupeSignals(signals)),
  };
}

/**
 * First-person self-trait hints mapped toward existing UserProfile columns.
 * Never returns partner-preference dealbreaker rows.
 */
export function extractSelfFactHintsFromFreeText(
  input: FreeTextInput,
): readonly SelfFactHint[] {
  const text = joinFields(input);
  if (!text) return [];
  const lower = text.toLowerCase();
  const hints: SelfFactHint[] = [];
  const seen = new Set<string>();

  for (const p of SELF_FACT_PATTERNS) {
    const r = new RegExp(
      p.re.source,
      p.re.flags.includes('g') ? p.re.flags : `${p.re.flags}g`,
    );
    let m: RegExpExecArray | null;
    while ((m = r.exec(lower)) !== null) {
      if (isNegatedBefore(lower, m.index)) continue;
      const key = `${p.field}:${p.value}`;
      if (seen.has(key)) break;
      seen.add(key);
      hints.push({
        field: p.field,
        value: p.value,
        evidence: p.label,
        confidence: 0.9,
      });
      break;
    }
  }
  return hints;
}
