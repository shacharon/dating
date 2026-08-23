/**
 * Mode-aware match card teaser builder (Sprint 44 Story 1).
 * Deterministic, no LLM, no ranking changes — display layer only.
 */

import { CHIP_TO_TRAIT } from '../explainability/core/match-explanation-traits';
import { truncateListTldrLine } from './match-list-tldr';
import type { MatchExplainabilityDto } from '../explainability/core/match-explainability';
import type { MatchRecommendationDto } from '../recommendation/match-recommendation';
import type { ProfileJsonPayload } from '../../profiles/profiles.types';
import type { EnrichmentSignalsV1 } from '../../evaluate/enrichment-signals';

/** Mirrors list priority tier — local copy to avoid matches → me-profile import. */
export type TeaserPriorityTier = 'HIGH' | 'GOOD' | 'OTHER';

/** Internal mode ids — never show age/generation labels in UI chrome. */
export type TeaserMode = 'first_chapter' | 'ready_again' | 'new_chapter';

export const DEFAULT_TEASER_MODE: TeaserMode = 'first_chapter';

/**
 * Resolve teaser mode: explicit dating chapter wins; else age proxy; else A.
 * Age bands: ≤34 A · ≤44 B · ≥45 C.
 */
export function resolveTeaserMode(input: {
  datingChapter?: TeaserMode | string | null;
  ageYears?: number | null;
}): TeaserMode {
  const chapter = input.datingChapter;
  if (
    chapter === 'first_chapter' ||
    chapter === 'ready_again' ||
    chapter === 'new_chapter'
  ) {
    return chapter;
  }
  const age = input.ageYears;
  if (age != null && Number.isFinite(age)) {
    if (age <= 34) return 'first_chapter';
    if (age <= 44) return 'ready_again';
    if (age >= 45) return 'new_chapter';
  }
  return DEFAULT_TEASER_MODE;
}

/** Story 1 ships English only; other locales still return EN. */
export type TeaserLocale = 'en';

export type MatchTeaserDto = {
  mode: TeaserMode;
  /** Always-visible primary lines (0–3). Mode B may be []. */
  lines: string[];
  /** Mode B hero sentence (life-goal claim). Omit for A/C. */
  claim?: string;
  /** Mode policy: badge/hero vs inline. */
  showScore: boolean;
  /** Score 0–100 when known; null when unscored. */
  score: number | null;
  /** Soft icebreaker hint (Mode A/C). Omit when no grounded ask. */
  askHint?: string;
};

export type MatchTeaserFacts = {
  score: number | null;
  priorityTier: TeaserPriorityTier;
  positiveChips: readonly string[];
  sharedInterestNote?: string | null;
  primaryTakeaway?: string | null;
  reasonShort?: string | null;
  kidsAligned?: boolean | null;
  kidsNote?: string | null;
  seriousnessNote?: string | null;
  dailyRhythmNote?: string | null;
  sharedInterestLabels?: readonly string[];
  locationOverlapNote?: string | null;
  /** Grounded ask topic without leading "ask about". */
  askTopic?: string | null;
};

export const TEASER_MODE_A_MAX_CHARS = 90;
export const TEASER_MODE_B_MAX_WORDS = 12;
export const TEASER_MODE_C_LINE_MAX_CHARS = 90;
export const TEASER_ASK_HINT_MAX_CHARS = 40;

export const TEASER_FALLBACK_LINE = 'Worth a closer look';

const STATIC_BANNED = [
  'alignment',
  'coefficient',
  'dealbreaker filter',
  'dealbreaker',
  'emotional depth',
  'friction score',
  'friction',
  'compatibility coefficient',
  'ambition alignment',
] as const;

/** Teaser-specific bans (separate from narrative voice — `%` and fallback are allowed). */
export const TEASER_BANNED_TOKENS: readonly string[] = [
  ...STATIC_BANNED,
  ...Object.keys(CHIP_TO_TRAIT),
];

const PART_SEP = ' · ';

const DAILY_RHYTHM_PAIR_NOTES: Readonly<Record<string, string>> = {
  late: 'Both night owls',
  early_bird: 'Both early birds',
  early_extreme: 'Both early birds',
  homebody: 'Same quiet evenings energy',
  quiet_evenings: 'Same quiet evenings energy',
  stable_nine_to_five: 'Same weekday rhythm',
  fast_paced: 'Same fast-paced energy',
  social_bursts_recharge: 'Same social burst energy',
};

const KIDS_ALIGNED_NOTES: Readonly<Record<string, string>> = {
  childfree: 'Both childfree',
  wants_kids_soon: 'Kids timeline aligned',
  wants_kids: 'Kids situation aligned',
  already_has_kids: 'Kids situation aligned',
  open_timeline: 'Kids timeline aligned',
};

const KIDS_WANT_FAMILY = new Set([
  'wants_kids',
  'wants_kids_soon',
]);
// `already_has_kids` only aligns via exact same-label match — do not invent
// alignment between "has kids" and "wants kids".

const SERIOUS_PACE = new Set([
  'measured_pace',
  'slow_build',
  'no_rush_explicit',
]);

function normalizeScore(score: number | null): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  return Math.round(score);
}

function containsBannedToken(text: string): boolean {
  const lower = text.toLowerCase();
  for (const token of TEASER_BANNED_TOKENS) {
    if (lower.includes(token.toLowerCase())) return true;
  }
  return false;
}

/**
 * Returns scrubbed fragment or null when empty / banned.
 */
export function scrubTeaserFragment(text: string): string | null {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  if (containsBannedToken(trimmed)) return null;
  return trimmed;
}

function stripSharedInterestPrefix(note: string): string {
  return note
    .replace(/^you both enjoy\s+/i, '')
    .replace(/\.$/, '')
    .trim();
}

function collectListPhrases(positiveChips: readonly string[]): string[] {
  const phrases: string[] = [];
  for (const chip of positiveChips) {
    const meta = CHIP_TO_TRAIT[chip];
    if (!meta) continue;
    const scrubbed = scrubTeaserFragment(meta.listPhrase);
    if (scrubbed) phrases.push(scrubbed);
  }
  return phrases;
}

function formatAskHint(askTopic: string): string {
  const topic = askTopic.replace(/^ask about\s+/i, '').trim();
  const hint = topic.toLowerCase().startsWith('ask ')
    ? topic
    : `ask about ${topic}`;
  return truncateListTldrLine(hint, TEASER_ASK_HINT_MAX_CHARS);
}

function capWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

function firstNonEmpty(
  ...candidates: Array<string | null | undefined>
): string | null {
  for (const c of candidates) {
    if (c == null) continue;
    const scrubbed = scrubTeaserFragment(c);
    if (scrubbed) return scrubbed;
  }
  return null;
}

function interestSpecific(facts: MatchTeaserFacts): string | null {
  if (facts.sharedInterestLabels && facts.sharedInterestLabels.length > 0) {
    const labels = facts.sharedInterestLabels
      .map((l) => scrubTeaserFragment(l))
      .filter((l): l is string => l != null);
    if (labels.length >= 2) {
      return scrubTeaserFragment(`${labels[0]} + ${labels[1]}`);
    }
    if (labels.length === 1) return labels[0]!;
  }
  if (facts.sharedInterestNote) {
    return scrubTeaserFragment(
      stripSharedInterestPrefix(facts.sharedInterestNote),
    );
  }
  return null;
}

function buildAskHint(facts: MatchTeaserFacts): string | undefined {
  if (!facts.askTopic) return undefined;
  const scrubbedTopic = scrubTeaserFragment(facts.askTopic);
  if (!scrubbedTopic) return undefined;
  const hint = formatAskHint(scrubbedTopic);
  return scrubTeaserFragment(hint) ?? undefined;
}

function buildModeA(facts: MatchTeaserFacts): MatchTeaserDto {
  const phrases = collectListPhrases(facts.positiveChips);
  const interests = interestSpecific(facts);
  const takeaway = facts.primaryTakeaway
    ? scrubTeaserFragment(facts.primaryTakeaway)
    : null;
  const reason = facts.reasonShort
    ? scrubTeaserFragment(facts.reasonShort)
    : null;

  const vibe = firstNonEmpty(
    facts.dailyRhythmNote,
    phrases[0],
    takeaway,
    reason,
  );
  const specific = firstNonEmpty(
    facts.kidsNote,
    interests,
    phrases[1],
    // When vibe came from enrichment/chips, takeaway can fill the specific slot.
    vibe &&
      takeaway &&
      takeaway !== vibe &&
      vibe !== takeaway
      ? takeaway
      : null,
    reason && reason !== vibe ? reason : null,
  );

  // Avoid duplicating the same fragment in vibe + specific.
  const parts: string[] = [];
  if (vibe) parts.push(vibe);
  if (specific && specific !== vibe) parts.push(specific);

  const askHint = buildAskHint(facts);
  if (askHint && !parts.some((p) => p.includes(askHint))) {
    parts.push(askHint);
  }

  let line =
    parts.length > 0 ? parts.join(PART_SEP) : TEASER_FALLBACK_LINE;
  line = truncateListTldrLine(line, TEASER_MODE_A_MAX_CHARS);

  const dto: MatchTeaserDto = {
    mode: 'first_chapter',
    lines: [line],
    showScore: true,
    score: normalizeScore(facts.score),
  };
  if (askHint) dto.askHint = askHint;
  return dto;
}

function buildModeB(facts: MatchTeaserFacts): MatchTeaserDto {
  const phrases = collectListPhrases(facts.positiveChips);
  const takeaway = facts.primaryTakeaway
    ? scrubTeaserFragment(facts.primaryTakeaway)
    : null;
  const reason = facts.reasonShort
    ? scrubTeaserFragment(facts.reasonShort)
    : null;

  let claim = firstNonEmpty(
    facts.seriousnessNote,
    facts.kidsAligned && facts.kidsNote ? facts.kidsNote : null,
    facts.kidsNote,
    phrases[0],
    takeaway,
    reason,
    TEASER_FALLBACK_LINE,
  )!;
  claim = capWords(claim, TEASER_MODE_B_MAX_WORDS);
  claim = scrubTeaserFragment(claim) ?? TEASER_FALLBACK_LINE;

  return {
    mode: 'ready_again',
    lines: [],
    claim,
    showScore: true,
    score: normalizeScore(facts.score),
  };
}

function buildModeC(facts: MatchTeaserFacts): MatchTeaserDto {
  const phrases = collectListPhrases(facts.positiveChips);
  const interests = interestSpecific(facts);
  const takeaway = facts.primaryTakeaway
    ? scrubTeaserFragment(facts.primaryTakeaway)
    : null;
  const reason = facts.reasonShort
    ? scrubTeaserFragment(facts.reasonShort)
    : null;
  const askHint = buildAskHint(facts);
  const score = normalizeScore(facts.score);

  const seriousness =
    firstNonEmpty(
      facts.seriousnessNote,
      phrases[0],
      takeaway,
      reason,
      TEASER_FALLBACK_LINE,
    ) ?? TEASER_FALLBACK_LINE;

  const line1 =
    score != null
      ? truncateListTldrLine(
          `${score}%${PART_SEP}${seriousness}`,
          TEASER_MODE_C_LINE_MAX_CHARS,
        )
      : truncateListTldrLine(seriousness, TEASER_MODE_C_LINE_MAX_CHARS);

  const practicalParts: string[] = [];
  for (const fragment of [
    facts.kidsNote,
    facts.locationOverlapNote,
    interests,
    phrases[1],
    takeaway && takeaway !== seriousness ? takeaway : null,
  ]) {
    const scrubbed = fragment ? scrubTeaserFragment(fragment) : null;
    if (scrubbed && !practicalParts.includes(scrubbed)) {
      practicalParts.push(scrubbed);
    }
  }
  if (askHint && !practicalParts.some((p) => p.includes(askHint))) {
    practicalParts.push(askHint);
  }

  const lines = [line1];
  if (practicalParts.length > 0) {
    lines.push(
      truncateListTldrLine(
        practicalParts.join(PART_SEP),
        TEASER_MODE_C_LINE_MAX_CHARS,
      ),
    );
  } else if (line1 === TEASER_FALLBACK_LINE || seriousness === TEASER_FALLBACK_LINE) {
    // keep single fallback line
  }

  const dto: MatchTeaserDto = {
    mode: 'new_chapter',
    lines,
    showScore: true,
    score,
  };
  if (askHint) dto.askHint = askHint;
  return dto;
}

/**
 * Build mode-aware teaser copy. Locale other than `en` still returns English (Story 1).
 */
export function buildMatchTeaser(
  mode: TeaserMode,
  facts: MatchTeaserFacts,
  _locale: TeaserLocale = 'en',
): MatchTeaserDto {
  switch (mode) {
    case 'ready_again':
      return buildModeB(facts);
    case 'new_chapter':
      return buildModeC(facts);
    case 'first_chapter':
    default:
      return buildModeA(facts);
  }
}

function readEnrichmentSignals(
  payload: ProfileJsonPayload | null | undefined,
): EnrichmentSignalsV1 | null {
  const signals = payload?.evaluation?.enrichment?.signals;
  if (!signals || typeof signals !== 'object') return null;
  return signals as EnrichmentSignalsV1;
}

function mapDailyRhythmNote(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  if (!a || !b) return null;
  if (a !== b) {
    // Compatible night/early pairs only when exact match — never invent.
    return null;
  }
  return DAILY_RHYTHM_PAIR_NOTES[a] ?? 'Matching daily rhythm';
}

function mapKidsNotes(
  a: string | null | undefined,
  b: string | null | undefined,
): { kidsAligned: boolean | null; kidsNote: string | null } {
  if (!a || !b) return { kidsAligned: null, kidsNote: null };
  if (a === b) {
    return {
      kidsAligned: true,
      kidsNote: KIDS_ALIGNED_NOTES[a] ?? 'Kids situation aligned',
    };
  }
  if (KIDS_WANT_FAMILY.has(a) && KIDS_WANT_FAMILY.has(b)) {
    return { kidsAligned: true, kidsNote: 'Kids situation aligned' };
  }
  return { kidsAligned: null, kidsNote: null };
}

function mapSeriousnessNote(
  paceA: string | null | undefined,
  paceB: string | null | undefined,
  chips: readonly string[],
): string | null {
  if (paceA && paceB && paceA === paceB && SERIOUS_PACE.has(paceA)) {
    return 'both want a real partnership';
  }
  if (
    paceA &&
    paceB &&
    SERIOUS_PACE.has(paceA) &&
    SERIOUS_PACE.has(paceB)
  ) {
    return 'Aligned on long-term · similar timeline';
  }
  if (chips.includes('Relationship expectations')) {
    const phrase = CHIP_TO_TRAIT['Relationship expectations']?.listPhrase;
    return phrase ? scrubTeaserFragment(phrase) : null;
  }
  return null;
}

function sharedInterestLabelsFromSignals(
  a: EnrichmentSignalsV1 | null,
  b: EnrichmentSignalsV1 | null,
  sharedInterestNote?: string | null,
): string[] {
  const aTags = a?.interestsTop3 ?? [];
  const bTags = b?.interestsTop3 ?? [];
  if (aTags.length && bTags.length) {
    const bSet = new Set(bTags.map((t) => t.toLowerCase()));
    const shared = aTags.filter((t) => bSet.has(t.toLowerCase()));
    if (shared.length > 0) return shared.slice(0, 3);
  }
  if (sharedInterestNote) {
    const stripped = stripSharedInterestPrefix(sharedInterestNote);
    // "hiking and cooking" / "hiking, cooking"
    const parts = stripped
      .split(/\s*(?:,|and)\s*/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.slice(0, 3);
  }
  return [];
}

export type AssembleMatchTeaserFactsInput = {
  score: number | null;
  priorityTier: TeaserPriorityTier;
  explainability: MatchExplainabilityDto | null;
  recommendation: MatchRecommendationDto | null;
  viewerPayload?: ProfileJsonPayload | null;
  candidatePayload?: ProfileJsonPayload | null;
};

/**
 * Assemble teaser facts from list/detail hydrate outputs (no extra DB reads).
 */
export function assembleMatchTeaserFacts(
  input: AssembleMatchTeaserFactsInput,
): MatchTeaserFacts {
  const expl = input.explainability;
  const viewerSignals = readEnrichmentSignals(input.viewerPayload);
  const candidateSignals = readEnrichmentSignals(input.candidatePayload);

  const kids = mapKidsNotes(
    viewerSignals?.kidsTimeline,
    candidateSignals?.kidsTimeline,
  );
  const dailyRhythmNote = mapDailyRhythmNote(
    viewerSignals?.dailyRhythm,
    candidateSignals?.dailyRhythm,
  );
  const seriousnessNote = mapSeriousnessNote(
    viewerSignals?.relationshipPace,
    candidateSignals?.relationshipPace,
    expl?.positiveChips ?? [],
  );
  const sharedInterestLabels = sharedInterestLabelsFromSignals(
    viewerSignals,
    candidateSignals,
    expl?.sharedInterestNote,
  );
  const askTopic =
    sharedInterestLabels.length > 0 ? sharedInterestLabels[0]! : null;

  return {
    score: input.score,
    priorityTier: input.priorityTier,
    positiveChips: expl?.positiveChips ?? [],
    sharedInterestNote: expl?.sharedInterestNote ?? null,
    primaryTakeaway: input.recommendation?.primaryTakeaway ?? null,
    reasonShort: expl?.reasonShort ?? null,
    kidsAligned: kids.kidsAligned,
    kidsNote: kids.kidsNote,
    seriousnessNote,
    dailyRhythmNote,
    sharedInterestLabels,
    askTopic,
  };
}

/** Convenience: teaser for list/detail rows with optional viewer chapter/age. */
export function buildDefaultMatchTeaser(
  input: AssembleMatchTeaserFactsInput,
  viewer?: {
    datingChapter?: TeaserMode | string | null;
    ageYears?: number | null;
  },
): MatchTeaserDto {
  const mode = resolveTeaserMode({
    datingChapter: viewer?.datingChapter,
    ageYears: viewer?.ageYears,
  });
  return buildMatchTeaser(mode, assembleMatchTeaserFacts(input), 'en');
}

/** When materialized rank overrides score, refresh score on an existing teaser. */
export function withTeaserScore(
  teaser: MatchTeaserDto,
  score: number | null,
): MatchTeaserDto {
  return {
    ...teaser,
    score: normalizeScore(score),
  };
}
