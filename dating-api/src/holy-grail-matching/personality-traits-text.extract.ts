/**
 * Deterministic personality-trait tags (v1 + v2 additive) from free-text profile fields
 * (`aboutMe` → self, `aboutPartner` → partner).
 * Only allowlisted phrases/words count as evidence — no LLM, no inference beyond explicit matches.
 *
 * v1: humor_playful, honesty_integrity
 * v2 additive: kind_empathetic, ambitious_driven, calm_steady, curious_open_minded,
 *               loyal_committed, optimistic_positive, introverted_reflective, extroverted_social
 *
 * Sprint 52 keyword engine: hg-personality-text
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN (Sprint 52 Story 02)
 * See docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 */

import { escapeRegExp, isNegatedBefore } from '../shared/text-match.utils';

export const PERSONALITY_TRAIT_TAGS = [
  'humor_playful',
  'honesty_integrity',
  'kind_empathetic',
  'ambitious_driven',
  'calm_steady',
  'curious_open_minded',
  'loyal_committed',
  'optimistic_positive',
  'introverted_reflective',
  'extroverted_social',
] as const;
export type PersonalityTraitTag = (typeof PERSONALITY_TRAIT_TAGS)[number];

export const PERSONALITY_TRAIT_TAG_SET = new Set<string>(
  PERSONALITY_TRAIT_TAGS,
);

/** First two ids (v1); remainder are v2 additive. */
export const PERSONALITY_TRAIT_V1_TAG_SET = new Set<string>(
  PERSONALITY_TRAIT_TAGS.slice(0, 2),
);

export const PERSONALITY_TRAIT_V2_TAG_SET = new Set<string>(
  PERSONALITY_TRAIT_TAGS.slice(2),
);

export type PersonalityTraitEvidenceHit = {
  readonly tag: PersonalityTraitTag;
  /** Allowlisted phrase or word that matched (audit). */
  readonly matchedPhrase: string;
};

export type PersonalityTraitsScopeExtraction = {
  readonly tags: readonly PersonalityTraitTag[];
  readonly evidence: readonly PersonalityTraitEvidenceHit[];
};

export type PersonalityTraitsTextExtraction = {
  readonly self: PersonalityTraitsScopeExtraction;
  readonly partner: PersonalityTraitsScopeExtraction;
};

/**
 * Word hit only when some occurrence is not in a lightweight "not …" scope (cf. lifestyle v2).
 */
function matchesNegatableWord(lower: string, word: string): boolean {
  const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    if (!isNegatedBefore(lower, m.index)) {
      return true;
    }
  }
  return false;
}

function pushPhraseEvidence(
  lower: string,
  phrases: readonly { readonly re: RegExp; readonly label: string }[],
  tag: PersonalityTraitTag,
  evidence: PersonalityTraitEvidenceHit[],
): void {
  for (const { re, label } of phrases) {
    const r = new RegExp(
      re.source,
      re.flags.includes('g') ? re.flags : `${re.flags}g`,
    );
    let m: RegExpExecArray | null;
    while ((m = r.exec(lower)) !== null) {
      if (!isNegatedBefore(lower, m.index)) {
        evidence.push({ tag, matchedPhrase: label });
      }
    }
  }
}

function pushWordEvidence(
  lower: string,
  words: readonly string[],
  tag: PersonalityTraitTag,
  evidence: PersonalityTraitEvidenceHit[],
): void {
  for (const w of words) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag, matchedPhrase: w });
    }
  }
}

const HONESTY_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bno\s+liars\b/i, label: 'no liars' },
  { re: /\btired\s+of\s+liars\b/i, label: 'tired of liars' },
  { re: /\bsick\s+of\s+liars\b/i, label: 'sick of liars' },
  { re: /\bdone\s+with\s+liars\b/i, label: 'done with liars' },
  { re: /\bwants?\s+honesty\b/i, label: 'wants honesty' },
  { re: /\bneeds?\s+honesty\b/i, label: 'needs honesty' },
  { re: /\bvalues?\s+honesty\b/i, label: 'values honesty' },
  { re: /\blooking\s+for\s+honesty\b/i, label: 'looking for honesty' },
  { re: /\bwants?\s+honest\b/i, label: 'want honest' },
];

const HONESTY_WORDS = [
  'honest',
  'truthful',
  'straightforward',
  'transparent',
] as const;
const HUMOR_WORDS = ['funny', 'humorous', 'witty', 'playful'] as const;

/** Anti-collision: skip "kind of" idiom for bare `kind`. */
const KIND_EMPHATIC_RE = /\bkind\b(?!\s+of\b)/i;

const KIND_EMPATHY_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bkind\s+heart(ed)?\b/i, label: 'kind heart' },
  { re: /\bkind\s+soul\b/i, label: 'kind soul' },
  { re: /\bdeeply\s+caring\b/i, label: 'deeply caring' },
];

const KIND_EMPATHY_WORDS = [
  'kindness',
  'empathetic',
  'compassionate',
  'caring',
] as const;

const AMBITION_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bgoal[\s-]oriented\b/i, label: 'goal-oriented' },
  { re: /\bhard[\s-]working\b/i, label: 'hard-working' },
  { re: /\bhigh\s+achiever\b/i, label: 'high achiever' },
];

const AMBITION_WORDS = ['ambitious', 'driven', 'motivated'] as const;

const CALM_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [
    { re: /\beasy\s+going\b/i, label: 'easy going' },
    { re: /\bgo\s+with\s+the\s+flow\b/i, label: 'go with the flow' },
  ];

const CALM_WORDS = ['calm', 'patient', 'steady', 'easygoing'] as const;

const CURIOUS_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bopen\s+minded\b/i, label: 'open minded' },
  { re: /\bopen-minded\b/i, label: 'open-minded' },
];

const CURIOUS_WORDS = ['curious'] as const;

const LOYAL_WORDS = ['loyal', 'dependable', 'reliable'] as const;

const OPTIMISM_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bpositive\s+outlook\b/i, label: 'positive outlook' },
  { re: /\bstay\s+positive\b/i, label: 'stay positive' },
];

const OPTIMISM_WORDS = ['optimistic', 'upbeat'] as const;

const INTROVERT_WORDS = ['introvert', 'introverted', 'reflective'] as const;

const EXTROVERT_WORDS = ['extrovert', 'extroverted', 'outgoing'] as const;

function pushKindWordEvidence(
  lower: string,
  evidence: PersonalityTraitEvidenceHit[],
): void {
  const re = new RegExp(KIND_EMPHATIC_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(lower)) !== null) {
    if (!isNegatedBefore(lower, m.index)) {
      evidence.push({ tag: 'kind_empathetic', matchedPhrase: 'kind' });
    }
  }
}

function scanScope(text: string): PersonalityTraitsScopeExtraction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { tags: [], evidence: [] };
  }
  const lower = trimmed.toLowerCase();
  const evidence: PersonalityTraitEvidenceHit[] = [];

  pushPhraseEvidence(lower, HONESTY_PHRASES, 'honesty_integrity', evidence);
  pushWordEvidence(lower, HONESTY_WORDS, 'honesty_integrity', evidence);
  pushWordEvidence(lower, HUMOR_WORDS, 'humor_playful', evidence);

  pushPhraseEvidence(lower, KIND_EMPATHY_PHRASES, 'kind_empathetic', evidence);
  pushKindWordEvidence(lower, evidence);
  pushWordEvidence(lower, KIND_EMPATHY_WORDS, 'kind_empathetic', evidence);

  pushPhraseEvidence(lower, AMBITION_PHRASES, 'ambitious_driven', evidence);
  pushWordEvidence(lower, AMBITION_WORDS, 'ambitious_driven', evidence);

  pushPhraseEvidence(lower, CALM_PHRASES, 'calm_steady', evidence);
  pushWordEvidence(lower, CALM_WORDS, 'calm_steady', evidence);

  pushPhraseEvidence(lower, CURIOUS_PHRASES, 'curious_open_minded', evidence);
  pushWordEvidence(lower, CURIOUS_WORDS, 'curious_open_minded', evidence);

  pushWordEvidence(lower, LOYAL_WORDS, 'loyal_committed', evidence);

  pushPhraseEvidence(lower, OPTIMISM_PHRASES, 'optimistic_positive', evidence);
  pushWordEvidence(lower, OPTIMISM_WORDS, 'optimistic_positive', evidence);

  pushWordEvidence(lower, INTROVERT_WORDS, 'introverted_reflective', evidence);
  pushWordEvidence(lower, EXTROVERT_WORDS, 'extroverted_social', evidence);

  const tagSet = new Set<PersonalityTraitTag>();
  for (const h of evidence) {
    tagSet.add(h.tag);
  }

  return {
    tags: PERSONALITY_TRAIT_TAGS.filter((t) => tagSet.has(t)),
    evidence,
  };
}

/**
 * Extract canonical personality trait tags using only fixed allowlist matches.
 * - `aboutMe` → `self`; `aboutPartner` → `partner`.
 * - Multi-label: multiple distinct tags (and multiple evidence rows) allowed per scope.
 */
export function extractPersonalityTraitsFromFreeText(input: {
  aboutMe?: string | null;
  aboutPartner?: string | null;
}): PersonalityTraitsTextExtraction {
  const aboutMe = typeof input.aboutMe === 'string' ? input.aboutMe : '';
  const aboutPartner =
    typeof input.aboutPartner === 'string' ? input.aboutPartner : '';
  return {
    self: scanScope(aboutMe),
    partner: scanScope(aboutPartner),
  };
}
