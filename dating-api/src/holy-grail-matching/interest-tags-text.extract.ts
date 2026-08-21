/**
 * Deterministic interest tags (taxonomy v1 + v2 additive) from free-text profile fields
 * (`aboutMe` → self, `aboutPartner` → partner).
 * Canonical ids only — allowlisted tokens/phrases, no LLM, sparse output, no defaults.
 *
 * v1: `music`, `film`
 * v2 additive: reading/books, sports, visual art, gaming, food, travel, photography, technology
 *
 * Sprint 52 keyword engine: hg-interest-text
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN (Sprint 52 Story 02)
 * See docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 */

/** Legacy v1 ids (prefix of full allowlist). */
export const INTEREST_TAGS_V1 = ['music', 'film'] as const;

export const INTEREST_TAGS = [
  ...INTEREST_TAGS_V1,
  'books_reading',
  'sports_fitness',
  'art_visual',
  'gaming',
  'food_dining',
  'travel',
  'photography',
  'technology',
] as const;
export type InterestTag = (typeof INTEREST_TAGS)[number];

/** @deprecated use {@link InterestTag} — full allowlist includes v2. */
export type InterestTagV1 = InterestTag;

/** Canonical allowlist for rankingSignals filtering / mapper validation (v1+v2). */
export const INTEREST_TAG_SET = new Set<string>(INTEREST_TAGS);

/** @deprecated alias of {@link INTEREST_TAG_SET} (name retained for imports). */
export const INTEREST_TAG_V1_SET = INTEREST_TAG_SET;

export const INTEREST_TAGS_V2_TAG_SET = new Set<string>(INTEREST_TAGS.slice(2));

export type InterestTagEvidenceHit = {
  readonly tag: InterestTag;
  readonly matchedPhrase: string;
};

export type InterestTagsScopeExtraction = {
  readonly tags: readonly InterestTag[];
  readonly evidence: readonly InterestTagEvidenceHit[];
};

export type InterestTagsTextExtraction = {
  readonly self: InterestTagsScopeExtraction;
  readonly partner: InterestTagsScopeExtraction;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isNegatedBefore(haystackLower: string, matchStart: number): boolean {
  const before = haystackLower.slice(0, matchStart);
  const t = before.trimEnd();
  return /\bnot(\s+[\w'-]+){0,6}\s*$/i.test(t);
}

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
  tag: InterestTag,
  evidence: InterestTagEvidenceHit[],
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
  tag: InterestTag,
  evidence: InterestTagEvidenceHit[],
): void {
  for (const w of words) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag, matchedPhrase: w });
    }
  }
}

const MUSIC_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\blive\s+music\b/i, label: 'live music' },
  { re: /\binto\s+music\b/i, label: 'into music' },
];

const MUSIC_WORDS = [
  'music',
  'concert',
  'concerts',
  'playlist',
  'playlists',
  'instrument',
  'instruments',
  'musician',
  'musicians',
  'band',
  'bands',
  'vinyl',
] as const;

const FILM_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [
    { re: /\bwatch\s+films\b/i, label: 'watch films' },
    { re: /\bwatch\s+movies\b/i, label: 'watch movies' },
    { re: /\blove\s+movies\b/i, label: 'love movies' },
  ];

const FILM_WORDS = [
  'film',
  'films',
  'movie',
  'movies',
  'cinema',
  'netflix',
] as const;

const BOOKS_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bbook\s+club\b/i, label: 'book club' },
  { re: /\blove\s+reading\b/i, label: 'love reading' },
  { re: /\bread\s+a\s+lot\b/i, label: 'read a lot' },
];

const BOOKS_WORDS = [
  'books',
  'novel',
  'novels',
  'reading',
  'bookworm',
  'kindle',
  'audiobook',
  'audiobooks',
  'literature',
] as const;

const SPORTS_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bteam\s+sports\b/i, label: 'team sports' },
  { re: /\bwatch\s+soccer\b/i, label: 'watch soccer' },
];

const SPORTS_WORDS = [
  'soccer',
  'basketball',
  'tennis',
  'baseball',
  'golf',
  'volleyball',
  'rugby',
  'cricket',
  'marathon',
  'cycling',
  'running',
  'yoga',
  'sports',
  'athlete',
  'athletics',
] as const;

const ART_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [
    { re: /\bmodern\s+art\b/i, label: 'modern art' },
    { re: /\bart\s+museum\b/i, label: 'art museum' },
  ];

const ART_WORDS = [
  'gallery',
  'museum',
  'museums',
  'painting',
  'paintings',
  'sculpture',
  'sculptures',
  'pottery',
] as const;

/** Anti-collision: skip `art director` (role); bare `art` otherwise. */
const ART_STANDALONE_RE = /\bart\b(?!\s+director\b)/i;

function pushArtStandaloneEvidence(
  lower: string,
  evidence: InterestTagEvidenceHit[],
): void {
  const r = new RegExp(ART_STANDALONE_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = r.exec(lower)) !== null) {
    if (!isNegatedBefore(lower, m.index)) {
      evidence.push({ tag: 'art_visual', matchedPhrase: 'art' });
    }
  }
}

const GAMING_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [
  { re: /\bvideo\s+games?\b/i, label: 'video games' },
  { re: /\bboard\s+games?\b/i, label: 'board games' },
  { re: /\bpc\s+games?\b/i, label: 'pc games' },
];

const GAMING_WORDS = [
  'gaming',
  'gamer',
  'playstation',
  'xbox',
  'nintendo',
  'esports',
] as const;

const FOOD_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [{ re: /\blove\s+cooking\b/i, label: 'love cooking' }];

const FOOD_WORDS = [
  'cooking',
  'recipe',
  'recipes',
  'foodie',
  'brunch',
  'chef',
  'baking',
  'cuisine',
] as const;

const TRAVEL_PHRASES: readonly {
  readonly re: RegExp;
  readonly label: string;
}[] = [{ re: /\blove\s+to\s+travel\b/i, label: 'love to travel' }];

const TRAVEL_WORDS = [
  'travel',
  'traveling',
  'travelling',
  'traveler',
  'traveller',
  'trip',
  'trips',
  'passport',
  'wanderlust',
  'backpacking',
] as const;

const PHOTO_WORDS = [
  'photography',
  'photographer',
  'photographers',
  'camera',
  'cameras',
  'dslr',
] as const;

const TECH_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] =
  [{ re: /\bopen\s+source\b/i, label: 'open source' }];

const TECH_WORDS = [
  'coding',
  'programming',
  'software',
  'tech',
  'engineer',
  'developer',
  'developers',
] as const;

function scanScope(text: string): InterestTagsScopeExtraction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { tags: [], evidence: [] };
  }
  const lower = trimmed.toLowerCase();
  const evidence: InterestTagEvidenceHit[] = [];

  pushPhraseEvidence(lower, MUSIC_PHRASES, 'music', evidence);
  pushWordEvidence(lower, MUSIC_WORDS, 'music', evidence);

  pushPhraseEvidence(lower, FILM_PHRASES, 'film', evidence);
  pushWordEvidence(lower, FILM_WORDS, 'film', evidence);

  pushPhraseEvidence(lower, BOOKS_PHRASES, 'books_reading', evidence);
  pushWordEvidence(lower, BOOKS_WORDS, 'books_reading', evidence);

  pushPhraseEvidence(lower, SPORTS_PHRASES, 'sports_fitness', evidence);
  pushWordEvidence(lower, SPORTS_WORDS, 'sports_fitness', evidence);

  pushPhraseEvidence(lower, ART_PHRASES, 'art_visual', evidence);
  pushArtStandaloneEvidence(lower, evidence);
  pushWordEvidence(lower, ART_WORDS, 'art_visual', evidence);

  pushPhraseEvidence(lower, GAMING_PHRASES, 'gaming', evidence);
  pushWordEvidence(lower, GAMING_WORDS, 'gaming', evidence);

  pushPhraseEvidence(lower, FOOD_PHRASES, 'food_dining', evidence);
  pushWordEvidence(lower, FOOD_WORDS, 'food_dining', evidence);

  pushPhraseEvidence(lower, TRAVEL_PHRASES, 'travel', evidence);
  pushWordEvidence(lower, TRAVEL_WORDS, 'travel', evidence);

  pushWordEvidence(lower, PHOTO_WORDS, 'photography', evidence);

  pushPhraseEvidence(lower, TECH_PHRASES, 'technology', evidence);
  pushWordEvidence(lower, TECH_WORDS, 'technology', evidence);

  const tagSet = new Set<InterestTag>();
  for (const h of evidence) {
    tagSet.add(h.tag);
  }

  return {
    tags: INTEREST_TAGS.filter((t) => tagSet.has(t)),
    evidence,
  };
}

/**
 * Extract canonical interest tags (v1+v2). Multi-label per scope when multiple themes match.
 * @deprecated name retained; prefer mentally "interest tags from free text".
 */
export function extractInterestTagsV1FromFreeText(input: {
  aboutMe?: string | null;
  aboutPartner?: string | null;
}): InterestTagsTextExtraction {
  const aboutMe = typeof input.aboutMe === 'string' ? input.aboutMe : '';
  const aboutPartner =
    typeof input.aboutPartner === 'string' ? input.aboutPartner : '';
  return {
    self: scanScope(aboutMe),
    partner: scanScope(aboutPartner),
  };
}
