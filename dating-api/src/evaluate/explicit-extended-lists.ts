/**
 * Regex-based explicit extended lists: deterministic pattern matching on profile text.
 * Pure functions, no DI, no LLM calls.
 *
 * Sprint 52 keyword engine: explicit-extended-lists (sibling of enrichment-v2)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN (Sprint 52 Story 02)
 * See docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 */

export interface ExplicitExtendedLists {
  interests: string[];
  lifestyleTraits: string[];
  preferences: string[];
  boundaries: string[];
  values: string[];
}

type ExtendedListKey =
  | 'interests'
  | 'lifestyleTraits'
  | 'preferences'
  | 'boundaries'
  | 'values';

interface ExplicitListRule {
  value: string;
  patterns: RegExp[];
  /**
   * Semantic bucket: synonyms and cross-array equivalents collapse here.
   * First winning array (by priority) keeps the phrase; others drop duplicates.
   */
  semanticId: string;
}

/** Max items per extended list; quality over coverage. */
const MAX_EXTENDED_LIST_ITEMS = 5;

/**
 * Process order: stricter relationship rules first, then partner asks, principles, self-style, activities.
 * Same semanticId appears at most once across all five arrays.
 */
const EXTENDED_LIST_PRIORITY: ExtendedListKey[] = [
  'boundaries',
  'preferences',
  'values',
  'lifestyleTraits',
  'interests',
];

const EXPLICIT_LIST_RULES: Record<ExtendedListKey, ExplicitListRule[]> = {
  interests: [
    {
      value: 'gym',
      semanticId: 'activity-gym',
      patterns: [/\bgym\b/i, /\bweightlifting\b/i],
    },
    {
      value: 'running',
      semanticId: 'activity-running',
      patterns: [/\brunning\b/i, /\bruns?\b/i],
    },
    {
      value: 'hiking',
      semanticId: 'activity-hiking',
      patterns: [/\bhiking\b/i, /\bhikes?\b/i],
    },
    { value: 'yoga', semanticId: 'activity-yoga', patterns: [/\byoga\b/i] },
    {
      value: 'cooking',
      semanticId: 'activity-cooking',
      patterns: [/\bcooking\b/i, /\bcooks at home\b/i],
    },
    {
      value: 'travel',
      semanticId: 'activity-travel',
      patterns: [/\btravel(?:ing|s)?\b/i, /\btravels?\b/i],
    },
    {
      value: 'reading',
      semanticId: 'activity-reading',
      patterns: [/\bI read\b/i, /\breading\b/i, /\bbooks?\b/i],
    },
    {
      value: 'music',
      semanticId: 'activity-music',
      patterns: [/\bmusic\b/i, /\bconcerts?\b/i],
    },
    {
      value: 'walking',
      semanticId: 'activity-walking',
      patterns: [/\bwalking\b/i, /\bwalks?\b/i],
    },
    {
      value: 'journaling',
      semanticId: 'activity-journaling',
      patterns: [/\bjournaling\b/i, /\bjournal(?:ing)?\b/i],
    },
    {
      value: 'swimming',
      semanticId: 'activity-swimming',
      patterns: [/\bswimming\b/i, /\bswims?\b/i],
    },
    {
      value: 'cycling',
      semanticId: 'activity-cycling',
      patterns: [/\bcycling\b/i, /\bbike rides?\b/i],
    },
    {
      value: 'gardening',
      semanticId: 'activity-gardening',
      patterns: [
        /\bgardening\b/i,
        /\b(?:I |we )garden\b/i,
        /(?:,|\band)\s+garden\b/i,
      ],
    },
    {
      value: 'restoration',
      semanticId: 'activity-restoration',
      patterns: [
        /\brestoration\b/i,
        /\brestoring\b/i,
        /\bI restore\b/i,
        /\brestore old\b/i,
      ],
    },
    {
      value: 'woodworking',
      semanticId: 'activity-woodworking',
      patterns: [/\bwoodworking\b/i, /\bbuild(?:s|ing)? furniture\b/i],
    },
  ],
  lifestyleTraits: [
    {
      value: 'health oriented',
      semanticId: 'lifestyle-health',
      patterns: [/\bhealth[-\s]?oriented\b/i, /\bhealth conscious\b/i],
    },
    {
      value: 'structured routine',
      semanticId: 'lifestyle-structure',
      patterns: [
        /\bstructured (?:life|routine|days?)\b/i,
        /\blike(?:s)? structure\b/i,
      ],
    },
    {
      value: 'night owl',
      semanticId: 'lifestyle-sleep-late',
      patterns: [/\bnight owl\b/i, /\bup late\b/i],
    },
    {
      value: 'early bird',
      semanticId: 'lifestyle-sleep-early',
      patterns: [/\bearly bird\b/i, /\bearly riser\b/i, /\bmorning person\b/i],
    },
    {
      value: 'reflective',
      semanticId: 'lifestyle-reflective',
      patterns: [/\breflective\b/i],
    },
    {
      value: 'rational thinker',
      semanticId: 'lifestyle-rational',
      patterns: [/\brational\b/i],
    },
    {
      value: 'social bursts recharge',
      semanticId: 'lifestyle-social-rhythm',
      patterns: [/\bsocial bursts?\b/i, /\balternating social\b/i],
    },
    {
      value: 'spontaneous',
      semanticId: 'lifestyle-spontaneous',
      patterns: [/\bspontaneous\b/i],
    },
    {
      value: 'home oriented',
      semanticId: 'lifestyle-quiet-home',
      patterns: [/\bquiet home\b/i, /\bquiet at home\b/i],
    },
  ],
  preferences: [
    {
      value: 'emotional maturity',
      semanticId: 'pref-em-maturity',
      patterns: [/\bemotional maturity\b/i, /\bemotionally mature\b/i],
    },
    {
      value: 'clear communication',
      semanticId: 'comm-direct',
      patterns: [/\bclear communication\b/i, /\bdirect communication\b/i],
    },
    {
      value: 'emotional literacy',
      semanticId: 'pref-em-literacy',
      patterns: [/\bemotional(?:ly)? literate\b/i, /\bemotional literacy\b/i],
    },
    {
      value: 'financial prudence',
      semanticId: 'pref-money-care',
      patterns: [
        /\bstrict with budgets?\b/i,
        /\bsaver\b/i,
        /\bfinancial(?:ly)? responsible\b/i,
        /\bmoney smart\b/i,
        /\bresponsib(?:le|ility) with money\b/i,
      ],
    },
    {
      value: 'values independence',
      semanticId: 'pref-autonomy',
      patterns: [
        /\bvalues (?:freedom|independence|autonomy)\b/i,
        /\bfreedom and autonomy\b/i,
      ],
    },
  ],
  boundaries: [
    {
      value: 'not rushed',
      semanticId: 'boundary-pacing',
      patterns: [/\bnot rushed\b/i, /\bno rush\b/i, /\bnot rushing\b/i],
    },
    {
      value: 'steady pace',
      semanticId: 'boundary-pacing',
      patterns: [/\bsteady pace\b/i, /\bslow pace\b/i],
    },
    {
      value: 'no drama',
      semanticId: 'boundary-no-drama',
      patterns: [/\bno drama\b/i, /\bavoid drama\b/i, /\bavoids drama\b/i],
    },
    {
      value: 'emotional safety',
      semanticId: 'boundary-em-safety',
      patterns: [/\bemotional safety\b/i, /\bsafe space\b/i],
    },
    {
      value: 'no games',
      semanticId: 'boundary-no-games',
      patterns: [/\bno games\b/i],
    },
    {
      value: 'wants children',
      semanticId: 'boundary-wants-children',
      patterns: [
        /(?<!\bdon't )\bwant(?:s)? (?:kids|children)\b/i,
        /(?<!\bdo not )\bwant(?:s)? (?:kids|children)\b/i,
      ],
    },
    {
      value: 'authenticity',
      semanticId: 'boundary-not-performance',
      patterns: [/\bnot into performance\b/i],
    },
    {
      value: 'needs personal space',
      semanticId: 'boundary-space',
      patterns: [
        /\bneed (?:my |a lot of )?space\b/i,
        /\bneed space\b/i,
        /\brespect.*space\b/i,
      ],
    },
    {
      value: 'honest communication',
      semanticId: 'comm-direct',
      patterns: [/\bhonest communication\b/i, /\bhonest dialogue\b/i],
    },
    {
      value: 'emotional clarity',
      semanticId: 'boundary-em-clarity',
      patterns: [/\bemotional clarity\b/i],
    },
  ],
  values: [
    {
      value: 'loyalty',
      semanticId: 'value-loyalty',
      patterns: [/\bloyal(?:ty)?\b/i],
    },
    {
      value: 'authenticity',
      semanticId: 'value-authenticity',
      patterns: [/\bauthentic(?:ity)?\b/i],
    },
    {
      value: 'faith or tradition',
      semanticId: 'value-faith-tradition',
      patterns: [
        /\bfaith\b/i,
        /\btradition(?:al)?\b/i,
        /\bspiritual practice\b/i,
      ],
    },
    {
      value: 'family first',
      semanticId: 'value-family-priority',
      patterns: [
        /\bfamily is everything\b/i,
        /\bfamily (?:first|comes first)\b/i,
        /\bputs family first\b/i,
      ],
    },
    {
      value: 'giving',
      semanticId: 'value-giving',
      patterns: [/\bgive to causes\b/i, /\bgiving to causes\b/i],
    },
    {
      value: 'education',
      semanticId: 'value-education',
      patterns: [
        /\bI teach\b/i,
        /\bhigh[-\s]?school teacher\b/i,
        /\bmiddle school teacher\b/i,
        /\beducation matters\b/i,
        /\bvalues? education\b/i,
      ],
    },
  ],
};

function normalizeListItem(value: string): string | null {
  const normalized = value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return null;
  const words = normalized.split(' ').filter(Boolean);
  if (words.length < 1 || words.length > 3) return null;
  return normalized;
}

export function buildExplicitExtendedLists(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): ExplicitExtendedLists {
  const text = [aboutMe, aboutPartner, aboutRelationship]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');

  const claimedSemantic = new Set<string>();
  const results: Record<ExtendedListKey, string[]> = {
    boundaries: [],
    preferences: [],
    values: [],
    lifestyleTraits: [],
    interests: [],
  };

  for (const key of EXTENDED_LIST_PRIORITY) {
    for (const rule of EXPLICIT_LIST_RULES[key]) {
      if (results[key].length >= MAX_EXTENDED_LIST_ITEMS) break;
      if (!rule.patterns.some((pattern) => pattern.test(text))) continue;
      const normalized = normalizeListItem(rule.value);
      if (!normalized) continue;
      if (claimedSemantic.has(rule.semanticId)) continue;
      claimedSemantic.add(rule.semanticId);
      results[key].push(normalized);
    }
  }

  return {
    interests: results.interests,
    lifestyleTraits: results.lifestyleTraits,
    preferences: results.preferences,
    boundaries: results.boundaries,
    values: results.values,
  };
}
