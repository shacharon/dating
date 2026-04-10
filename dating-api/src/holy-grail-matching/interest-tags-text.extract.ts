/**
 * Deterministic interest tags (taxonomy v1) from free-text profile fields (`aboutMe` → self, `aboutPartner` → partner).
 * Canonical ids only: `music`, `film`. Allowlisted tokens — no polarity, sparse output, no defaults.
 *
 * Map examples:
 * - music, concerts, playlists, instruments → `music`
 * - movies, films, cinema, netflix → `film`
 */

export const INTEREST_TAGS_V1 = ['music', 'film'] as const;
export type InterestTagV1 = (typeof INTEREST_TAGS_V1)[number];

export const INTEREST_TAG_V1_SET = new Set<string>(INTEREST_TAGS_V1);

export type InterestTagEvidenceHit = {
  readonly tag: InterestTagV1;
  readonly matchedPhrase: string;
};

export type InterestTagsScopeExtraction = {
  readonly tags: readonly InterestTagV1[];
  readonly evidence: readonly InterestTagEvidenceHit[];
};

export type InterestTagsTextExtraction = {
  readonly self: InterestTagsScopeExtraction;
  readonly partner: InterestTagsScopeExtraction;
};

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesNegatableWord(lower: string, word: string): boolean {
  return new RegExp(`(?<!\\bnot )\\b${escapeRegExp(word)}\\b`, 'i').test(lower);
}

const MUSIC_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] = [
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

const FILM_PHRASES: readonly { readonly re: RegExp; readonly label: string }[] = [
  { re: /\bwatch\s+films\b/i, label: 'watch films' },
  { re: /\bwatch\s+movies\b/i, label: 'watch movies' },
  { re: /\blove\s+movies\b/i, label: 'love movies' },
];

const FILM_WORDS = ['film', 'films', 'movie', 'movies', 'cinema', 'netflix'] as const;

function scanScope(text: string): InterestTagsScopeExtraction {
  const trimmed = text.trim();
  if (!trimmed) {
    return { tags: [], evidence: [] };
  }
  const lower = trimmed.toLowerCase();
  const evidence: InterestTagEvidenceHit[] = [];

  for (const { re, label } of MUSIC_PHRASES) {
    if (re.test(lower)) {
      evidence.push({ tag: 'music', matchedPhrase: label });
    }
  }
  for (const w of MUSIC_WORDS) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag: 'music', matchedPhrase: w });
    }
  }

  for (const { re, label } of FILM_PHRASES) {
    if (re.test(lower)) {
      evidence.push({ tag: 'film', matchedPhrase: label });
    }
  }
  for (const w of FILM_WORDS) {
    if (matchesNegatableWord(lower, w)) {
      evidence.push({ tag: 'film', matchedPhrase: w });
    }
  }

  const tagSet = new Set<InterestTagV1>();
  for (const h of evidence) {
    tagSet.add(h.tag);
  }

  return {
    tags: INTEREST_TAGS_V1.filter((t) => tagSet.has(t)),
    evidence,
  };
}

/** Extract v1 interest tags. Multi-label per scope when both themes match. */
export function extractInterestTagsV1FromFreeText(input: {
  aboutMe?: string | null;
  aboutPartner?: string | null;
}): InterestTagsTextExtraction {
  const aboutMe = typeof input.aboutMe === 'string' ? input.aboutMe : '';
  const aboutPartner = typeof input.aboutPartner === 'string' ? input.aboutPartner : '';
  return {
    self: scanScope(aboutMe),
    partner: scanScope(aboutPartner),
  };
}
