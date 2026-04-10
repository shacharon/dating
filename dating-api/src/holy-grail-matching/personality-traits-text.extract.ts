/**
 * Deterministic personality-trait tags from free-text profile fields (`aboutMe` → self, `aboutPartner` → partner).
 * Only allowlisted phrases/words count as evidence — no inference beyond explicit matches.
 */

export const PERSONALITY_TRAIT_TAGS = ['humor_playful', 'honesty_integrity'] as const;
export type PersonalityTraitTag = (typeof PERSONALITY_TRAIT_TAGS)[number];

export const PERSONALITY_TRAIT_TAG_SET = new Set<string>(PERSONALITY_TRAIT_TAGS);

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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Single-word trait tokens where a leading `not ` should block a match. */
function matchesNegatableWord(lower: string, word: string): boolean {
  return new RegExp(`(?<!\\bnot )\\b${escapeRegExp(word)}\\b`, 'i').test(lower);
}

const HONESTY_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] = [
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

const HONESTY_WORDS = ['honest', 'truthful', 'straightforward', 'transparent'] as const;
const HUMOR_WORDS = ['funny', 'humorous', 'witty', 'playful'] as const;

function scanScope(text: string): PersonalityTraitsScopeExtraction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { tags: [], evidence: [] };
  }
  const lower = trimmed.toLowerCase();
  const evidence: PersonalityTraitEvidenceHit[] = [];

  for (const { re, label } of HONESTY_PHRASES) {
    if (re.test(lower)) {
      evidence.push({ tag: 'honesty_integrity', matchedPhrase: label });
    }
  }

  for (const w of HONESTY_WORDS) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag: 'honesty_integrity', matchedPhrase: w });
    }
  }

  for (const w of HUMOR_WORDS) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag: 'humor_playful', matchedPhrase: w });
    }
  }

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
  const aboutPartner = typeof input.aboutPartner === 'string' ? input.aboutPartner : '';
  return {
    self: scanScope(aboutMe),
    partner: scanScope(aboutPartner),
  };
}
