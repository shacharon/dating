/**
 * Sprint 52 keyword engine: enrichment-v2 (structural split — Sprint 57 Story 02)
 * Inventory: docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_INVENTORY.md
 * KEYWORD ENGINE FROZEN — docs/sprints/sprint-52-keyword-engine-freeze/KEYWORD_ENGINE_FREEZE.md
 * No new regex/phrases/allowlist ids without RFC in that doc.
 *
 * This module: Allowlist + interest extractors + interest window guards.
 */

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

export function interestsTop3V2(text: string): string[] {
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
