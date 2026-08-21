/**
 * ENRICHMENT_V2 core + V3/V4 extensions (autonomyTogethernessDepth + interestsTop3 only).
 * Deterministic closed-code mapping only; emits snake_case enum strings; no scoring side effects.
 *
 * Sprint 52 keyword engine: enrichment-v2
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN (Sprint 52 Story 02)
 * See docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 */

/** Mapper output before `sanitizeEnrichmentSignalsV1` (labels are intended to be canonical snake_case). */
export interface EnrichmentMappedSignals {
  dailyRhythm: string | null;
  autonomyTogethernessDepth: string | null;
  kidsTimeline: string | null;
  conflictStyleDetail: string | null;
  relationshipPace: string | null;
  communicationMode: string | null;
  interestsTop3: string[];
}

function joinBlocks(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): string {
  return [aboutMe, aboutPartner, aboutRelationship]
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Intentionally different from `shared/text-match.utils` `isNegatedBefore`
 * (HG: 6-word `not` scope). Enrichment uses a char window + broader negation
 * tokens — do not unify without a Sprint 52 keyword-freeze RFC (Sprint 60 Story 2).
 */
function isNegatedBefore(
  text: string,
  matchIndex: number,
  window = 48,
): boolean {
  const start = Math.max(0, matchIndex - window);
  const prefix = text.slice(start, matchIndex);
  return /\b(not|never|isn'?t|aren'?t|without|no\s+longer|am\s+not|wasn'?t)\s*$/i.test(
    prefix,
  );
}

const INTEREST_ALLOWLIST = new Set([
  'walking',
  'hiking',
  'music',
  'reading',
  'swimming',
  'lifting',
  'cycling',
  'cooking',
  'travel',
  'photography',
  'extreme_sports',
  'journaling',
  'yoga',
  'gaming',
  'meditation',
  'pilates',
  'gym',
  'running',
  /** ENRICHMENT_V3 — closed codes only */
  'fungi',
  'pottery',
  'model_building',
  'boating',
  'fermentation',
  'cartography',
]);

const COOKING_JOB_HINT =
  /\b(pastry\s+cook|line\s+cook|in\s+kitchens|service\s+season|head\s+chef|sous\s+chef)\b/i;

function cookingAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 100),
    Math.min(text.length, idx + 100),
  );
  return !COOKING_JOB_HINT.test(win);
}

const BREWERY_YEAST_LAB_HINT =
  /\b(?:yeast\s+labs?|at\s+a\s+brewery|brewery)\b/i;

function fermentationAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 120),
    Math.min(text.length, idx + 120),
  );
  if (/\bfermentation journals\b/i.test(win)) return true;
  if (BREWERY_YEAST_LAB_HINT.test(win)) return false;
  return true;
}

function sporePrintsAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 140),
    Math.min(text.length, idx + 140),
  );
  if (/\b(?:weekend|foray|guide|hobby|neighbor|porch|forays?)\b/i.test(win))
    return true;
  if (/\blab tech\b/i.test(win)) return false;
  return true;
}

function potteryAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 140),
    Math.min(text.length, idx + 140),
  );
  if (
    /\b(?:learning pottery|pottery badly|my own|weekend|sabbatical|studio)\b/i.test(
      win,
    )
  )
    return true;
  if (
    /\b(?:elementary art teacher|teach(?:es|ing)?\s+fifth|teach(?:es|ing)?\s+kids)\b/i.test(
      win,
    )
  )
    return false;
  return true;
}

function cartographyAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 200),
    Math.min(text.length, idx + 200),
  );
  if (/\b(?:map new neighborhoods|for fun)\b/i.test(win)) return true;
  if (
    /\b(?:paper conservator|I restore old maps?|restore old maps?)\b/i.test(win)
  )
    return false;
  return true;
}

const MODEL_BUILDING_LEISURE_HINT =
  /\b(?:weekends?|solo|for fun|outside work)\b/i;

const FURNITURE_MODEL_BUILDING_PHRASE =
  /\b(?:build furniture from plans|furniture building)\b/i;

function modelBuildingAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 160),
    Math.min(text.length, idx + 160),
  );
  const head = text.slice(0, idx);
  if (MODEL_BUILDING_LEISURE_HINT.test(win)) return true;
  if (
    FURNITURE_MODEL_BUILDING_PHRASE.test(
      text.slice(idx, Math.min(text.length, idx + 48)),
    ) &&
    /\barchitectural model maker\b/i.test(head)
  ) {
    return true;
  }
  if (
    /\barchitectural model maker\b/i.test(text.slice(0, 220)) &&
    !MODEL_BUILDING_LEISURE_HINT.test(win)
  ) {
    return false;
  }
  if (/\b(?:weekend|evening|hobby|tabletop|painting miniatures)\b/i.test(win))
    return true;
  if (/\barchitectural model maker\b/i.test(win)) return false;
  return true;
}

function boatingAllowedAt(text: string, idx: number): boolean {
  const win = text.slice(
    Math.max(0, idx - 140),
    Math.min(text.length, idx + 140),
  );
  return (
    /\b(?:restore|ashore|fiberglass|yard|cousin|sailing|weekend)\b/i.test(
      win,
    ) || /\bfiberglass skiffs?\b/i.test(win)
  );
}

function bikeMeansCycling(text: string, idx: number): boolean {
  const slice = text.slice(idx, Math.min(text.length, idx + 24));
  return !/^\s*bike\s+lanes?\b/i.test(slice);
}

/** Phrase → allowlist code (document order; checked before token rules). */
const INTEREST_PHRASE_RULES: {
  value: string;
  pattern: RegExp;
  guard?: (text: string, idx: number) => boolean;
}[] = [
  { value: 'photography', pattern: /\bdarkroom\b/i },
  { value: 'photography', pattern: /\bfilm developing\b/i },
  { value: 'photography', pattern: /\bsilver stains\b/i },
  { value: 'extreme_sports', pattern: /\bparagliding\b/i },
  { value: 'walking', pattern: /\borchard walks?\b/i },
  { value: 'walking', pattern: /\btrail walks?\b/i },
  /** ENRICHMENT_V4 — handmade miss review */
  { value: 'walking', pattern: /\bsolo walks? the orchard\b/i },
  { value: 'cooking', pattern: /\bpatisserie weekends\b/i },
  { value: 'cooking', pattern: /\bcompete in (?:regional\s+)?patisserie\b/i },
  {
    value: 'model_building',
    pattern: /\bbuild furniture from plans\b/i,
    guard: modelBuildingAllowedAt,
  },
  {
    value: 'model_building',
    pattern: /\bfurniture building\b/i,
    guard: modelBuildingAllowedAt,
  },
  { value: 'swimming', pattern: /\bswim(?:ming)?\s+laps\b/i },
  {
    value: 'fungi',
    pattern: /\b(?:mushroom forays?|mushroom foraging|weekend mushroom)\b/i,
  },
  { value: 'fungi', pattern: /\bforay guide\b/i },
  {
    value: 'fungi',
    pattern: /\bspore prints\b/i,
    guard: sporePrintsAllowedAt,
  },
  { value: 'fungi', pattern: /\bfungi\b/i },
  { value: 'pottery', pattern: /\blearning pottery\b/i },
  { value: 'pottery', pattern: /\bpottery badly\b/i },
  {
    value: 'pottery',
    pattern: /\b(?:pottery|ceramics?)\b/i,
    guard: potteryAllowedAt,
  },
  {
    value: 'boating',
    pattern: /\b(?:fiberglass skiffs?|restore old fiberglass skiffs?)\b/i,
  },
  {
    value: 'boating',
    pattern: /\bskiffs?\b/i,
    guard: boatingAllowedAt,
  },
  {
    value: 'fermentation',
    pattern: /\bfermentation journals\b/i,
  },
  {
    value: 'fermentation',
    pattern: /\bfermentation\b/i,
    guard: fermentationAllowedAt,
  },
  {
    value: 'cartography',
    pattern: /\b(?:map(?:-|\s+)?making|mapmaking)\b/i,
    guard: cartographyAllowedAt,
  },
  { value: 'cartography', pattern: /\bmap\s+new\s+neighborhoods\b/i },
  { value: 'cartography', pattern: /\bread topo maps?\s+for fun\b/i },
  {
    value: 'model_building',
    pattern: /\bscale models?\b/i,
    guard: modelBuildingAllowedAt,
  },
  {
    value: 'model_building',
    pattern: /\bminiatures?\b/i,
    guard: modelBuildingAllowedAt,
  },
  {
    value: 'model_building',
    pattern: /\bmodel building\b/i,
    guard: modelBuildingAllowedAt,
  },
];

type TokenRule = {
  value: string;
  pattern: RegExp;
  guard?: (text: string, idx: number) => boolean;
};

function interestsTop3V2(text: string): string[] {
  const lower = text.toLowerCase();
  const found: { index: number; value: string }[] = [];
  const seen = new Set<string>();

  for (const { value, pattern, guard } of INTEREST_PHRASE_RULES) {
    pattern.lastIndex = 0;
    const m = pattern.exec(lower);
    if (m && m.index >= 0 && !seen.has(value)) {
      if (guard && !guard(lower, m.index)) continue;
      seen.add(value);
      found.push({ index: m.index, value });
    }
  }

  const tokenRules: TokenRule[] = [
    { value: 'gym', pattern: /\bgym\b/gi },
    { value: 'gym', pattern: /\bfitness\b/gi },
    { value: 'lifting', pattern: /\blift(?:s|ing)?\s+(?:at|weights?)\b/gi },
    { value: 'lifting', pattern: /\blifting\b/gi },
    { value: 'walking', pattern: /\bwalking\b/gi },
    {
      value: 'walking',
      pattern: /\bwalks?\b/gi,
      guard: (t, i) => !/^walks?\s+the\b/i.test(t.slice(i, i + 24)),
    },
    { value: 'journaling', pattern: /\bjournaling\b/gi },
    { value: 'journaling', pattern: /\bjournal(?:ing)?\b/gi },
    { value: 'reading', pattern: /\breading\b/gi },
    { value: 'reading', pattern: /\bbooks?\b/gi },
    { value: 'swimming', pattern: /\bswim(?:ming)?\b/gi },
    { value: 'hiking', pattern: /\bhiking\b/gi },
    { value: 'hiking', pattern: /\bhikes?\b/gi },
    { value: 'yoga', pattern: /\byoga\b/gi },
    {
      value: 'cooking',
      pattern: /\bcooking\b/gi,
      guard: (t, i) => cookingAllowedAt(t, i),
    },
    {
      value: 'cooking',
      pattern: /\bcook(?:s|ing)?\b/gi,
      guard: (t, i) => cookingAllowedAt(t, i),
    },
    { value: 'travel', pattern: /\btravel(?:ing|s)?\b/gi },
    { value: 'travel', pattern: /\btravels?\b/gi },
    { value: 'music', pattern: /\bmusic\b/gi },
    { value: 'photography', pattern: /\bphotography\b/gi },
    { value: 'gaming', pattern: /\bgaming\b/gi },
    { value: 'gaming', pattern: /\bvideo games?\b/gi },
    { value: 'meditation', pattern: /\bmeditation\b/gi },
    { value: 'meditation', pattern: /\bmeditate\b/gi },
    { value: 'pilates', pattern: /\bpilates\b/gi },
    { value: 'cycling', pattern: /\bcycling\b/gi },
    { value: 'cycling', pattern: /\bbiking\b/gi },
    {
      value: 'cycling',
      pattern: /\bbikes?\b/gi,
      guard: (t, i) => bikeMeansCycling(t, i),
    },
    {
      value: 'cycling',
      pattern: /\bbike\b/gi,
      guard: (t, i) => bikeMeansCycling(t, i),
    },
  ];

  for (const rule of tokenRules) {
    const re = new RegExp(rule.pattern.source, 'gi');
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      const idx = m.index;
      const tok = m[0].toLowerCase();
      if (tok === 'run' || tok === 'runs' || tok === 'running') continue;
      if (rule.guard && !rule.guard(lower, idx)) continue;
      if (!seen.has(rule.value)) {
        seen.add(rule.value);
        found.push({ index: idx, value: rule.value });
        break;
      }
    }
  }

  const runHobbyRe =
    /\b(?:go(?:es|ing)?\s+for\s+a\s+run|5k|10k|marathon|running\s+(?:outside|daily|every|morning|evening|together|before\s+sunrise))\b/gi;
  runHobbyRe.lastIndex = 0;
  let rm: RegExpExecArray | null;
  while ((rm = runHobbyRe.exec(lower)) !== null) {
    if (!seen.has('running')) {
      seen.add('running');
      found.push({ index: rm.index, value: 'running' });
      break;
    }
  }

  found.sort((a, b) => a.index - b.index);
  const out: string[] = [];
  const ordered = new Set<string>();
  for (const x of found) {
    if (!ordered.has(x.value) && INTEREST_ALLOWLIST.has(x.value)) {
      ordered.add(x.value);
      out.push(x.value);
      if (out.length >= 3) break;
    }
  }
  return out;
}

const DAILY_RHYTHM_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'early_extreme',
    patterns: [/\b4\s*am\b/i, /\b4am\b/i, /\bearly kitchen\b/i],
  },
  {
    value: 'irregular',
    patterns: [
      /\bnight shifts?\b/i,
      /\bnight[-\s]?shift\b/i,
      /\brotation(?:al)?\b/i,
      /\btravel[-\s]?heavy\b/i,
      /\btravel heavy\b/i,
      /\btwo weeks on\b/i,
      /\bon[-\s]call\b/i,
    ],
  },
  {
    value: 'social_bursts_recharge',
    patterns: [
      /\bsocial bursts?\b/i,
      /\balternating social\b/i,
      /\bsocial bursts? and recharge\b/i,
    ],
  },
  {
    value: 'slow_mornings',
    patterns: [/\bslow mornings?\b/i, /\bslow sundays?\b/i],
  },
  {
    value: 'late',
    patterns: [/\bnight owl\b/i, /\blate nights?\b/i, /\bup late\b/i],
  },
  {
    value: 'early_bird',
    patterns: [
      /\bearly bird\b/i,
      /\bearly riser\b/i,
      /\bmorning person\b/i,
      /\bbefore sunrise\b/i,
      /\bbefore dawn\b/i,
      /\bruns? before (?:sunrise|dawn)\b/i,
      /\brunning before (?:sunrise|dawn)\b/i,
      /\bup before (?:the )?sun\b/i,
    ],
  },
  {
    value: 'stable_nine_to_five',
    patterns: [/\bstable 9-5\b/i, /\b9-5\b/i, /\bnine[-\s]?to[-\s]?five\b/i],
  },
  {
    value: 'fast_paced',
    patterns: [
      /\bvery fast lifestyle\b/i,
      /\bfast[-\s]?paced\b/i,
      /\bfast pace\b/i,
    ],
  },
  {
    value: 'homebody',
    patterns: [
      /\bhomebody\b/i,
      /\bstay in most nights\b/i,
      /\bquiet nights in\b/i,
    ],
  },
  {
    value: 'startup_grind',
    patterns: [/\bstartup grind\b/i, /\bgrind mode\b/i],
  },
  {
    value: 'location_flexible',
    patterns: [
      /\bdigital nomad\b/i,
      /\bwork(?:ing)? remotely\b/i,
      /\bfull(?:y)? remote\b/i,
      /,\s*remote\b/i,
      /\bnot tied to one place\b/i,
      /\blived in (?:several|three|two|four|five|\d+)\s+countries\b/i,
    ],
  },
  {
    value: 'quiet_evenings',
    patterns: [
      /\bnot into nightlife\b/i,
      /\bavoid(?:ing)? nightlife\b/i,
      /\bno nightlife\b/i,
    ],
  },
];

const AUTONOMY_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'closeness_individuality',
    patterns: [
      /\bcloseness without losing individuality\b/i,
      /\bwithout losing (myself|individuality)\b/i,
    ],
  },
  {
    value: 'values_alone_time',
    patterns: [
      /\bneed alone time (?:to|for) (?:recharge|reset|decompress|think|think clearly)\b/i,
      /\bneed (?:my |our )?space (?:to|in order to) (?:recharge|reset|think)\b/i,
      /\bvalue (?:my|our) alone time\b/i,
      /\bvalues (?:my|our) alone time\b/i,
      /\bvalues?\s+alone time\s+to\s+(?:recharge|decompress|reset)\b/i,
      /\bvalue alone time\s+to\s+decompress\b/i,
      /\balone time (?:is|as) (?:essential|non[-\s]?negotiable|sacred)\b/i,
      /\bnon[-\s]?negotiable.{0,60}\balone time\b/is,
      /\balone time.{0,40}\bnon[-\s]?negotiable\b/is,
    ],
  },
  {
    value: 'enmeshment',
    patterns: [/\beverything together\b/i, /\bdo everything together\b/i],
  },
  {
    value: 'independence_with_space',
    patterns: [
      /\bneed my time\b/i,
      /\bneed my own time\b/i,
      /\bneed my (?:personal )?space\b/i,
      /\bdecompress(?:ing)?\s+alone\b/i,
      /\bsolo\s+recharges?\b/i,
      /\bneed\s+space\s+after\s+work\b/i,
      /\bneed\s+time\s+to\s+myself\b/i,
      /\bneed\s+time\s+to\s+yourselves\b/i,
      /\broom\s+to\s+breathe\b/i,
      /\bown\s+corners?\b/i,
      /\bown\s+lanes?\b/i,
      /\bneed\s+an?\s+hour\s+alone\b/i,
      /\bdecompress(?:ing)?\s+after\s+(?:a\s+)?shift\b/i,
      /\bneed\s+space\s+after\s+(?:work|conflict|(?:a\s+)?fight|tense\s+conversation|crowded|interpreting|(?:a\s+)?shift)\b/i,
      /\bneeds?\s+personal\s+space\s+after\b/i,
      /\bnot rushed into cohabiting\b/i,
      /\bspace after a fight\b/i,
      /\balone time to finish deep work\b/i,
    ],
  },
  {
    value: 'interdependence',
    patterns: [
      /\bindependent together\b/i,
      /\bspace but close\b/i,
      /\bindependent but connected\b/i,
      /\btogether but independent\b/i,
      /\bindependence and intimacy\b/i,
      /\binterdependence\b/i,
      /\binterdependent\b/i,
      /\bclose\s+but\s+not\s+fused\b/i,
      /\btogether\s+but\s+not\s+(?:on\s+top\s+of\s+each\s+other|all\s+over\s+each\s+other)\b/i,
      /\btogether\s+but\s+not\s+on\s+top\b/i,
      /\bseparate\s+hobbies(?:\s*,\s*shared\s+core)?\b/i,
      /\binterdependence\s+over\s+fusion\b/i,
      /\bslow pace on merging lives\b/i,
      /\blife outside mine\b/i,
    ],
  },
  {
    value: 'quality_over_quantity',
    patterns: [/\bquality time over quantity\b/i, /\bquality over quantity\b/i],
  },
];

const KIDS_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'childfree',
    patterns: [
      /\bchildfree\b/i,
      /\bdon't want kids\b/i,
      /\bdo not want (kids|children)\b/i,
      /\bno plans for kids\b/i,
    ],
  },
  {
    value: 'wants_kids_soon',
    patterns: [
      /\bwants? kids soon\b/i,
      /\bkids soon\b/i,
      /\bwant (a )?baby soon\b/i,
      /\bwant kids soon\b/i,
    ],
  },
  {
    value: 'open_timeline',
    patterns: [
      /\bopen to kids\b/i,
      /\bmaybe kids\b/i,
      /\bflexible on kids\b/i,
      /\bflexible on (?:the )?timeline\b/i,
      /\bopen on kids timeline\b/i,
      /\bflexible on kids timeline\b/i,
    ],
  },
  {
    value: 'wants_kids',
    patterns: [
      /\bwants? children\b/i,
      /\bfamily oriented\b/i,
      /\bfamily-oriented\b/i,
      /\bwants? (a )?family\b/i,
      /\bready for kids\b/i,
      /\bfamily planning\b/i,
      /\bwants kids is\b/i,
    ],
  },
  {
    value: 'already_has_kids',
    patterns: [
      /\balready have (kids|children)\b/i,
      /\balready has kids\b/i,
      /\bsingle parent\b/i,
      /\bcoparent\b/i,
      /\bhave two kids\b/i,
      /\bdivorced dad\b/i,
      /\bdivorced mom\b/i,
    ],
  },
];

function firstMatching(
  text: string,
  rules: { value: string; patterns: RegExp[] }[],
): string | null {
  for (const rule of rules) {
    if (rule.patterns.some((p) => p.test(text))) return rule.value;
  }
  return null;
}

/** Earliest match in combined text wins; ties break by rule order (ENRICHMENT_V3 for autonomy). */
function firstMatchingEarliest(
  text: string,
  rules: { value: string; patterns: RegExp[] }[],
): string | null {
  let best: { index: number; ruleOrder: number; value: string } | null = null;
  for (let ri = 0; ri < rules.length; ri++) {
    const rule = rules[ri];
    for (const p of rule.patterns) {
      const m = p.exec(text);
      if (m && m.index >= 0) {
        const idx = m.index;
        if (
          !best ||
          idx < best.index ||
          (idx === best.index && ri < best.ruleOrder)
        ) {
          best = { index: idx, ruleOrder: ri, value: rule.value };
        }
      }
    }
  }
  return best?.value ?? null;
}

function matchWithdrawsShutsDown(text: string): boolean {
  const rules: { source: string; negation: boolean }[] = [
    { source: String.raw`\bI shut down\b`, negation: false },
    {
      source: String.raw`\bshut(?:s|ting)? down (?:when|if|during|after)\b`,
      negation: true,
    },
    { source: String.raw`\b(?:go|going) silent\b`, negation: true },
    { source: String.raw`\bstonewall(?:ing)?\b`, negation: true },
    {
      source: String.raw`\bwithdraw(?:s|ing)? (?:when|if|during)\b`,
      negation: true,
    },
    { source: String.raw`\bfreeze(?:s|ing)? up\b`, negation: true },
  ];
  for (const { source, negation } of rules) {
    const re = new RegExp(source, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (!negation || !isNegatedBefore(text, m.index)) return true;
    }
  }
  return false;
}

function matchConflictStyleV2(text: string): string | null {
  const escalateRules = [
    {
      value: 'escalates_quickly',
      patterns: [
        /\bescalate(?:s|d)?\s+(?:fast|quickly|rapidly|so fast)\b/i,
        /\bthings escalate (?:fast|quickly)\b/i,
        /\b(?:fights?|arguments?) (?:that )?escalate (?:fast|quickly)?\b/i,
        /\b(?:I |we )escalate\b/i,
        /\b(?:gets?|getting) (?:heated|intense)\b/i,
        /\bvoice gets loud\b/i,
        /\bblow(?:s|ing)? up (?:in|during|when)\b/i,
      ],
    },
  ];
  if (firstMatching(text, escalateRules)) return 'escalates_quickly';
  if (matchWithdrawsShutsDown(text)) return 'withdraws_shuts_down';

  const humorRules = [
    {
      value: 'humor_deflect',
      patterns: [
        /\bhumor (?:to|and) deflect\b/i,
        /\bdeflect(?:s|ing)? with humor\b/i,
        /\bjoke to (?:lighten|defuse)\b/i,
        /\buse(?:s|ing)? humor when (?:things get|it gets) (?:heavy|serious)\b/i,
      ],
    },
  ];
  if (firstMatching(text, humorRules)) return 'humor_deflect';

  const indirectRules = [
    {
      value: 'indirect_communication',
      patterns: [
        /\bpassive[-\s]?aggressive\b/i,
        /\bread between the lines\b/i,
        /\btoo much subtext\b/i,
        /\bsubtext (?:instead|rather than|over)\b/i,
        /\bbeat around the bush\b/i,
        /\bindirect (?:communication|communicator|style)\b/i,
        /\bhint(?:s|ing)? instead of (?:saying|telling|being)\b/i,
        /\bdrop(?:ping)? hints (?:instead|rather than)\b/i,
        /\bnot (?:very )?direct when (?:upset|mad|hurt|angry)\b/i,
      ],
    },
  ];
  if (firstMatching(text, indirectRules)) return 'indirect_communication';

  const cooldownRules = [
    {
      value: 'cooldown_then_talk',
      patterns: [
        /\bcool(?:\s|-)?down after\b/i,
        /\bcooldown after\b/i,
        /\bneed(?:s)? (?:an? |some )?hour alone before\b/i,
        /\btime to cool off\b/i,
        /\bspace after (?:a )?(?:fight|conflict|argument)\b/i,
        /\bpause before (?:I |you |we )?(?:respond|reply|speak)\b/i,
        /\bstep away before\b/i,
      ],
    },
  ];
  if (firstMatching(text, cooldownRules)) return 'cooldown_then_talk';

  const processRules = [
    {
      value: 'process_together',
      patterns: [
        /\btalk it through\b/i,
        /\btalks issues through\b/i,
        /\bprocess together\b/i,
        /\bcalm discussion\b/i,
        /\btalk it out calmly\b/i,
      ],
    },
  ];
  if (firstMatching(text, processRules)) return 'process_together';

  const repairDirectRules = [
    {
      value: 'repair_direct',
      patterns: [/\bdirect repair\b/i, /\bprefer(?:s|ring)? direct repair\b/i],
    },
  ];
  if (firstMatching(text, repairDirectRules)) return 'repair_direct';

  const repairBlameRules = [
    {
      value: 'repair_over_blame',
      patterns: [
        /\brepair over blame\b/i,
        /\bprefer(?:s|ring)? repair over blame\b/i,
        /\brepair rather than blame\b/i,
      ],
    },
  ];
  if (firstMatching(text, repairBlameRules)) return 'repair_over_blame';

  const avoidRules = [
    {
      value: 'avoids_conflict',
      patterns: [
        /\bno drama\b/i,
        /\bavoid(?:s|ing)? drama\b/i,
        /\bavoid(?:s|ing)? conflict\b/i,
        /\bconflict[- ]?avoidant\b/i,
        /\bhate(?:s)? arguing\b/i,
        /\bavoid(?:s|ing)? arguments?\b/i,
        /\bdon't like (?:to )?(?:fight|argue)\b/i,
        /\bnot into (?:fighting|drama)\b/i,
      ],
    },
  ];
  if (firstMatching(text, avoidRules)) return 'avoids_conflict';

  return null;
}

// ── Relationship pace rules ───────────────────────────────────────────────────
// Signals how quickly someone wants to move through relationship milestones.
// Uses `firstMatching` (first rule wins); high-precision phrases only.

const RELATIONSHIP_PACE_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'fast_mover',
    patterns: [
      /\bnot looking for a pen pal\b/i,
      /\bready to settle down\b/i,
      /\bwant(?:ing)? to meet (?:soon|quickly|right away)\b/i,
      /\bno more back and forth\b/i,
      /\bnot here for pen pals\b/i,
      /\bready to take the next step\b/i,
      /\bwant(?:s|ing)? to move forward\b/i,
      /\bnot interested in (?:casual|long[-\s]?drawn[-\s]?out)\b/i,
    ],
  },
  {
    value: 'slow_build',
    patterns: [
      /\btake things (?:very )?slow(?:ly)?\b/i,
      /\bprefer(?:ring)? a slow build\b/i,
      /\bslow burn\b/i,
      /\bneed time to (?:really )?get to know\b/i,
      /\bbuild (?:things |it )?(?:slowly|gradually)\b/i,
      /\bgo slow\b/i,
    ],
  },
  {
    value: 'no_rush_explicit',
    patterns: [
      /\bno rush\b/i,
      /\bnot in a(?:ny)? hurry\b/i,
      /\btake things at (?:our|my) own pace\b/i,
      /\bno pressure\b/i,
      /\bwhenever it feels right\b/i,
      /\bat (?:our|a) natural pace\b/i,
    ],
  },
  {
    value: 'measured_pace',
    patterns: [
      /\bsee where things go\b/i,
      /\blet things (?:develop|unfold|progress) naturally\b/i,
      /\btake it one step at a time\b/i,
      /\bnot rushing but (?:I'm |I am )?serious\b/i,
      /\btake it as it comes\b/i,
      /\blet it flow naturally\b/i,
    ],
  },
];

// ── Communication mode rules ──────────────────────────────────────────────────
// Signals preferred communication register. Priority order matters: more specific
// labels (`deep_talker`) are checked before broader ones (`verbal_expressive`).

const COMMUNICATION_MODE_RULES: { value: string; patterns: RegExp[] }[] = [
  {
    value: 'deep_talker',
    patterns: [
      /\bcould talk for hours\b/i,
      /\btalk for hours\b/i,
      /\blate[-\s]?night conversations\b/i,
      /\bphilosophical discussions\b/i,
      /\blove a good debate\b/i,
      /\bdeep conversations? (?:about|on|over)\b/i,
      /\blong conversations? about (?:life|everything|anything)\b/i,
    ],
  },
  {
    value: 'action_oriented',
    patterns: [
      /\bshow up (?:rather|instead of) (?:talking|words)\b/i,
      /\bactions? speak louder\b/i,
      /\bexpress (?:myself |love )?through actions?\b/i,
      /\bI show,? not tell\b/i,
      /\bdeeds,? not words\b/i,
      /\bshow(?:ing)? (?:up|love) through (?:actions?|doing)\b/i,
    ],
  },
  {
    value: 'reserved_opener',
    patterns: [
      /\btakes? time to open up\b/i,
      /\bslow to open up\b/i,
      /\bprivate person\b/i,
      /\bdon'?t share easily\b/i,
      /\bnot (?:very )?open right away\b/i,
      /\bguarded at first\b/i,
    ],
  },
  {
    value: 'text_heavy',
    patterns: [
      /\blove texting\b/i,
      /\bgood (?:at |with )?communication over text\b/i,
      /\btext a lot\b/i,
      /\bbetter over text\b/i,
      /\btext[-\s]?based communicator\b/i,
    ],
  },
  {
    value: 'verbal_expressive',
    patterns: [
      /\blove talking\b/i,
      /\bneed to (?:talk|express myself)\b/i,
      /\bvery expressive\b/i,
      /\bexpress (?:myself |my feelings )?(?:verbally|with words|through talking)\b/i,
      /\bopen communicator\b/i,
      /\bvery (?:communicative|verbal)\b/i,
    ],
  },
];

export function mapEnrichmentV2FromText(text: string): EnrichmentMappedSignals {
  return {
    dailyRhythm: firstMatching(text, DAILY_RHYTHM_RULES),
    autonomyTogethernessDepth: firstMatchingEarliest(text, AUTONOMY_RULES),
    kidsTimeline: firstMatching(text, KIDS_RULES),
    conflictStyleDetail: matchConflictStyleV2(text),
    relationshipPace: firstMatching(text, RELATIONSHIP_PACE_RULES),
    communicationMode: firstMatching(text, COMMUNICATION_MODE_RULES),
    interestsTop3: interestsTop3V2(text),
  };
}

export function buildEnrichmentSignalsV2(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): EnrichmentMappedSignals {
  return mapEnrichmentV2FromText(
    joinBlocks(aboutMe, aboutPartner, aboutRelationship),
  );
}
