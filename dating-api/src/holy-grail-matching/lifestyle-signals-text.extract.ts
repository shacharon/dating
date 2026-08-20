/**
 * Deterministic lifestyle signal tags (taxonomy v1 + v2 additive) from free-text profile fields
 * (`aboutMe` → self, `aboutPartner` → partner).
 * Allowlisted phrases/words only — no LLM, no polarity defaults, sparse output when nothing matches.
 *
 * v1 examples:
 * - swimmer, swimming, pool, laps → athletic_swimming
 * - nature, outdoors, hiking, camping, parks → outdoors_nature
 * - homebody, cozy at home, likes staying home → homebody
 * - loves friends, weekends with friends, social with friends → social_friends
 *
 * v2 additive: fitness, travel, food, nightlife, pets, reading, gaming (same extraction rules).
 *
 * Sprint 52 keyword engine: hg-lifestyle-text
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * Do not add ad-hoc regex/phrases without that inventory + Story 02/03 process.
 */

export const LIFESTYLE_SIGNAL_TAGS = [
  'athletic_swimming',
  'outdoors_nature',
  'homebody',
  'social_friends',
  'fitness',
  'travel',
  'food',
  'nightlife',
  'pets',
  'reading',
  'gaming',
] as const;
export type LifestyleSignalTag = (typeof LIFESTYLE_SIGNAL_TAGS)[number];

export const LIFESTYLE_SIGNAL_TAG_SET = new Set<string>(LIFESTYLE_SIGNAL_TAGS);

/** First four allowlist ids (v1); remainder are v2 additive. */
export const LIFESTYLE_SIGNAL_V1_TAG_SET = new Set<string>(
  LIFESTYLE_SIGNAL_TAGS.slice(0, 4),
);

export const LIFESTYLE_SIGNAL_V2_TAG_SET = new Set<string>(
  LIFESTYLE_SIGNAL_TAGS.slice(4),
);

export type LifestyleSignalEvidenceHit = {
  readonly tag: LifestyleSignalTag;
  readonly matchedPhrase: string;
};

export type LifestyleSignalsScopeExtraction = {
  readonly tags: readonly LifestyleSignalTag[];
  readonly evidence: readonly LifestyleSignalEvidenceHit[];
};

export type LifestyleSignalsTextExtraction = {
  readonly self: LifestyleSignalsScopeExtraction;
  readonly partner: LifestyleSignalsScopeExtraction;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * True when the match at `matchStart` is immediately preceded by a lightweight "not …" scope
 * (up to a few words), e.g. "not a swimmer", "not into hiking".
 */
function isNegatedBefore(haystackLower: string, matchStart: number): boolean {
  const before = haystackLower.slice(0, matchStart);
  const t = before.trimEnd();
  return /\bnot(\s+[\w'-]+){0,6}\s*$/i.test(t);
}

/**
 * Word hit only when some occurrence is not in a lightweight "not …" scope before the token
 * (same idea as {@link isNegatedBefore}), so "not a gym person" / "not into travel" do not fire.
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
  tag: LifestyleSignalTag,
  evidence: LifestyleSignalEvidenceHit[],
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
  tag: LifestyleSignalTag,
  evidence: LifestyleSignalEvidenceHit[],
): void {
  for (const w of words) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag, matchedPhrase: w });
    }
  }
}

/** Extra swim phrases beyond single-token allowlist (explicit evidence only). */
const SWIM_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [
    { re: /\blap\s+swim\b/i, label: 'lap swim' },
    { re: /\blap\s+swimming\b/i, label: 'lap swimming' },
    { re: /\bswim\s+team\b/i, label: 'swim team' },
    { re: /\bopen\s+water\s+swim/i, label: 'open water swim' },
  ];

const SWIM_WORDS = ['swimmer', 'swimming', 'swims', 'pool', 'laps'] as const;

const OUTDOORS_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [{ re: /\bnational\s+park\b/i, label: 'national park' }];

const OUTDOORS_WORDS = [
  'nature',
  'outdoors',
  'hiking',
  'camping',
  'park',
  'parks',
] as const;

const HOMEBODY_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bcozy\s+at\s+home\b/i, label: 'cozy at home' },
  { re: /\bcozy\s+nights?\s+in\b/i, label: 'cozy nights in' },
  { re: /\bcozy\s+nights?\s+at\s+home\b/i, label: 'cozy nights at home' },
  { re: /\blikes?\s+staying\s+home\b/i, label: 'likes staying home' },
  { re: /\bstaying\s+home\b/i, label: 'staying home' },
  { re: /\bstaying\s+in\b/i, label: 'staying in' },
  { re: /\bstay\s+at\s+home\b/i, label: 'stay at home' },
  { re: /\bnights?\s+in\b/i, label: 'nights in' },
];

const HOMEBODY_WORDS = ['homebody'] as const;

const SOCIAL_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bloves?\s+friends\b/i, label: 'loves friends' },
  { re: /\bweekends?\s+with\s+friends\b/i, label: 'weekends with friends' },
  { re: /\bsocial\s+with\s+friends\b/i, label: 'social with friends' },
  { re: /\bwith\s+my\s+friends\b/i, label: 'with my friends' },
  { re: /\bwith\s+friends\b/i, label: 'with friends' },
  { re: /\bfriend\s+group\b/i, label: 'friend group' },
  { re: /\bdinner\s+with\s+friends\b/i, label: 'dinner with friends' },
  { re: /\bsocial\s+life\b/i, label: 'social life' },
];

/** Anti-collision: avoid bare "game" (novels, sports) and bare "pet" (pet peeve / pet project). */
const FITNESS_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bwork\s+outs?\b/i, label: 'work out' },
  { re: /\bhit\s+the\s+gym\b/i, label: 'hit the gym' },
  { re: /\bweight\s+lifting\b/i, label: 'weight lifting' },
  { re: /\bstrength\s+training\b/i, label: 'strength training' },
];

const FITNESS_WORDS = [
  'gym',
  'yoga',
  'pilates',
  'cardio',
  'fitness',
  'crossfit',
  'runner',
  'running',
  'lifting',
  'peloton',
] as const;

const TRAVEL_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\blove\s+to\s+travel\b/i, label: 'love to travel' },
  { re: /\blove\s+traveling\b/i, label: 'love traveling' },
  { re: /\blove\s+travelling\b/i, label: 'love travelling' },
];

const TRAVEL_WORDS = [
  'travel',
  'traveling',
  'travelling',
  'traveler',
  'traveller',
  'trip',
  'trips',
  'wanderlust',
  'backpacking',
  'passport',
  'abroad',
] as const;

const FOOD_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [
    { re: /\blove\s+cooking\b/i, label: 'love cooking' },
    { re: /\bwine\s+tasting\b/i, label: 'wine tasting' },
    { re: /\btrying\s+new\s+restaurants\b/i, label: 'trying new restaurants' },
  ];

const FOOD_WORDS = [
  'foodie',
  'cooking',
  'baking',
  'brunch',
  'cuisine',
  'restaurant',
  'restaurants',
  'chef',
  'wine',
] as const;

const NIGHTLIFE_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bnight\s+out\b/i, label: 'night out' },
  { re: /\bdance\s+floor\b/i, label: 'dance floor' },
  { re: /\brooftop\s+bars?\b/i, label: 'rooftop bar' },
  { re: /\bdance\s+clubs?\b/i, label: 'dance club' },
  { re: /\bgoing\s+out\b(?!\s+of\b)/i, label: 'going out' },
];

/** Anti-collision: no lone "club" (golf club, book club). */
const NIGHTLIFE_WORDS = [
  'nightlife',
  'nightclub',
  'nightclubs',
  'clubbing',
] as const;

const PETS_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [
    { re: /\bfur\s+babies?\b/i, label: 'fur baby' },
    { re: /\banimal\s+lover\b/i, label: 'animal lover' },
    { re: /\bpet[\s-]friendly\b/i, label: 'pet-friendly' },
    { re: /\bdog\s+mom\b/i, label: 'dog mom' },
    { re: /\bcat\s+dad\b/i, label: 'cat dad' },
    { re: /\brescue\s+dog\b/i, label: 'rescue dog' },
  ];

const PETS_WORDS = [
  'dog',
  'dogs',
  'cat',
  'cats',
  'puppy',
  'puppies',
  'kitten',
  'kittens',
] as const;

const READING_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\blove\s+reading\b/i, label: 'love reading' },
  { re: /\bread\s+a\s+lot\b/i, label: 'read a lot' },
  { re: /\bavid\s+reader\b/i, label: 'avid reader' },
];

const READING_WORDS = [
  'read',
  'reading',
  'bookworm',
  'novel',
  'novels',
  'kindle',
  'audiobook',
  'audiobooks',
] as const;

const GAMING_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bvideo\s+games?\b/i, label: 'video games' },
  { re: /\bboard\s+games?\b/i, label: 'board games' },
  { re: /\bpc\s+gaming\b/i, label: 'pc gaming' },
];

const GAMING_WORDS = [
  'gaming',
  'gamer',
  'playstation',
  'xbox',
  'nintendo',
  'esports',
] as const;

function scanScope(text: string): LifestyleSignalsScopeExtraction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { tags: [], evidence: [] };
  }
  const lower = trimmed.toLowerCase();
  const evidence: LifestyleSignalEvidenceHit[] = [];

  pushPhraseEvidence(lower, SWIM_PHRASES, 'athletic_swimming', evidence);
  pushWordEvidence(lower, SWIM_WORDS, 'athletic_swimming', evidence);

  pushPhraseEvidence(lower, OUTDOORS_PHRASES, 'outdoors_nature', evidence);
  pushWordEvidence(lower, OUTDOORS_WORDS, 'outdoors_nature', evidence);

  pushPhraseEvidence(lower, HOMEBODY_PHRASES, 'homebody', evidence);
  pushWordEvidence(lower, HOMEBODY_WORDS, 'homebody', evidence);

  pushPhraseEvidence(lower, SOCIAL_PHRASES, 'social_friends', evidence);

  pushPhraseEvidence(lower, FITNESS_PHRASES, 'fitness', evidence);
  pushWordEvidence(lower, FITNESS_WORDS, 'fitness', evidence);

  pushPhraseEvidence(lower, TRAVEL_PHRASES, 'travel', evidence);
  pushWordEvidence(lower, TRAVEL_WORDS, 'travel', evidence);

  pushPhraseEvidence(lower, FOOD_PHRASES, 'food', evidence);
  pushWordEvidence(lower, FOOD_WORDS, 'food', evidence);

  pushPhraseEvidence(lower, NIGHTLIFE_PHRASES, 'nightlife', evidence);
  pushWordEvidence(lower, NIGHTLIFE_WORDS, 'nightlife', evidence);

  pushPhraseEvidence(lower, PETS_PHRASES, 'pets', evidence);
  pushWordEvidence(lower, PETS_WORDS, 'pets', evidence);

  pushPhraseEvidence(lower, READING_PHRASES, 'reading', evidence);
  pushWordEvidence(lower, READING_WORDS, 'reading', evidence);

  pushPhraseEvidence(lower, GAMING_PHRASES, 'gaming', evidence);
  pushWordEvidence(lower, GAMING_WORDS, 'gaming', evidence);

  const tagSet = new Set<LifestyleSignalTag>();
  for (const h of evidence) {
    tagSet.add(h.tag);
  }

  return {
    tags: LIFESTYLE_SIGNAL_TAGS.filter((t) => tagSet.has(t)),
    evidence,
  };
}

/**
 * Extract canonical lifestyle signal tags (v1 + v2). Multi-label per scope; omit empty scopes downstream.
 */
export function extractLifestyleSignalsFromFreeText(input: {
  aboutMe?: string | null;
  aboutPartner?: string | null;
}): LifestyleSignalsTextExtraction {
  const aboutMe = typeof input.aboutMe === 'string' ? input.aboutMe : '';
  const aboutPartner =
    typeof input.aboutPartner === 'string' ? input.aboutPartner : '';
  return {
    self: scanScope(aboutMe),
    partner: scanScope(aboutPartner),
  };
}
