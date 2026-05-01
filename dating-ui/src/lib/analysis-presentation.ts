/**
 * Presentation mapper for /dating/analysis.
 *
 * Converts raw `evaluationJson` (UserProfileEvaluation) into a stable UI view
 * model. All internal/debug/trace fields are excluded here, so JSX never needs
 * to know about the raw evaluation structure.
 *
 * Pure function — no side effects, no API calls, fully testable.
 */

// ─── Raw evaluation shape (only the fields we read) ──────────────────────────

interface RawSignals {
  [key: string]: number | null | undefined;
}

interface RawExtractedDomain {
  signals?: RawSignals;
  confidence?: number;
}

interface RawChip {
  label: string;
  source?: string;
  strength?: string;
}

interface RawAttractionTraits {
  ambition?: number | null;
  statusOrientation?: number | null;
  physicalPriority?: number | null;
  kindnessWarmth?: number | null;
  stabilityReliability?: number | null;
  independenceAutonomy?: number | null;
  emotionalDepth?: number | null;
  traditionalismValues?: number | null;
  financialPrudence?: number | null;
}

interface RawEvaluation {
  // Rendered fields
  display?: { summary?: string; insight?: string; note?: string };
  flags?: string[];
  chips?: { self?: RawChip[]; partner?: RawChip[] };
  self?: RawExtractedDomain;
  relationship?: RawExtractedDomain;
  extendedSignals?: {
    version?: string;
    relationshipMotivation?: { relationshipMotivation?: string };
    attractionTraits?: { attraction?: RawAttractionTraits; confidence?: number };
    interests?: string[];
    lifestyleTraits?: string[];
    preferences?: string[];
    values?: string[];
    boundaries?: string[];
  };

  // All other fields (partner, compatibility, productScores, enrichment, _usage,
  // _evaluateLlmTraces, etc.) are deliberately NOT listed here so they never
  // reach the view model.
}

// ─── View model ───────────────────────────────────────────────────────────────

export interface AnalysisViewModel {
  heroTitle: string;
  /** From display.summary; null when unavailable. */
  heroSubtitle: string | null;
  /** Honesty note: from display.note or sparse-data fallback; null when not needed. */
  note: string | null;
  /** Up to 3 self-trait labels (chips-first, then signal keys, then value tags). */
  selfHighlights: string[];
  /** Up to 3 partner-preference labels (chips-first, then attraction traits). */
  partnerHighlights: string[];
  /** Up to 3 fill-in prompts; empty array when profile is rich enough. */
  missingPieces: string[];
  /** True when LOW_COVERAGE or LOW_CONFIDENCE flag is present. */
  isSparse: boolean;
}

// ─── Signal-key → human label ─────────────────────────────────────────────────

const SELF_SIGNAL_LABELS: Record<string, string> = {
  emotionalDepth: 'Goes deep emotionally',
  attachmentSecurity: 'Feels settled in who you are',
  directness: 'Honest and direct',
  independence: 'Values your own space',
  socialBattery: 'Knows your social limits',
  lifestylePace: 'Prefers a grounded pace',
  ambition: 'Driven by growth',
  healthBodyConsciousness: 'Pays attention to wellbeing',
  spirituality: 'Has a spiritual side',
  intellectualCuriosity: 'Curious and engaged',
  conflictStyle: 'Thoughtful under pressure',
  noveltyVsRoutine: 'Open to new things',
  structureChaosTolerance: 'Can sit with uncertainty',
  traditionalism: 'Appreciates tradition',
  financialMindset: 'Thinks about the long term',
  relationshipClarity: 'Knows what you want',
  physicalPriority: 'Physical connection matters',
  statusOrientation: 'Driven by achievement',
};

const ATTRACTION_TRAIT_LABELS: Record<string, string> = {
  kindnessWarmth: 'Warmth and genuine kindness',
  stabilityReliability: 'Someone steady and reliable',
  emotionalDepth: 'Emotional maturity',
  independenceAutonomy: 'Comfortable in their own skin',
  ambition: 'Has direction and drive',
  statusOrientation: 'Motivated and goal-oriented',
  physicalPriority: 'Physical presence matters',
  traditionalismValues: 'Rooted in their values',
  financialPrudence: 'Financially grounded',
};

const FILL_IN_PROMPTS: string[] = [
  'Tell us more about how you handle disagreement in a relationship.',
  'Describe the kind of daily rhythm or pace that feels right to you.',
  'Say more about the kind of person you genuinely admire in real life.',
];

const HERO_TITLE = 'Your profile is taking shape';
const SPARSE_NOTE =
  "We're still learning from what you've shared. A bit more will help us see you more clearly.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

/** Returns up to `max` non-null signal keys sorted by value descending. */
function topSignalLabels(
  signals: RawSignals | undefined,
  labelMap: Record<string, string>,
  max: number,
): string[] {
  if (!signals) return [];
  return Object.entries(signals)
    .filter(([, v]) => v != null && typeof v === 'number')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, max)
    .map(([k]) => labelMap[k])
    .filter((label): label is string => Boolean(label));
}

/** Returns top attraction trait labels sorted by value descending. */
function topAttractionLabels(
  traits: RawAttractionTraits | undefined,
  max: number,
): string[] {
  if (!traits) return [];
  return Object.entries(traits)
    .filter(([, v]) => v != null && typeof v === 'number')
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, max)
    .map(([k]) => ATTRACTION_TRAIT_LABELS[k])
    .filter((label): label is string => Boolean(label));
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

export function mapEvaluationToViewModel(raw: unknown): AnalysisViewModel {
  const ev: RawEvaluation =
    raw != null && typeof raw === 'object' ? (raw as RawEvaluation) : {};

  const flags: string[] = Array.isArray(ev.flags) ? ev.flags : [];
  const isSparse =
    flags.includes('LOW_COVERAGE') || flags.includes('LOW_CONFIDENCE');

  // ── Hero ────────────────────────────────────────────────────────────────────
  const heroSubtitle = ev.display?.summary?.trim() || null;
  const note =
    ev.display?.note?.trim() ||
    (isSparse ? SPARSE_NOTE : null);

  // ── Self highlights ──────────────────────────────────────────────────────────
  const selfFromChips = (ev.chips?.self ?? [])
    .slice(0, 3)
    .map((c) => c.label)
    .filter(Boolean);

  const selfFromSignals = topSignalLabels(
    { ...ev.self?.signals, ...ev.relationship?.signals },
    SELF_SIGNAL_LABELS,
    3,
  );

  const selfFromTags = dedupe([
    ...(ev.extendedSignals?.values ?? []),
    ...(ev.extendedSignals?.lifestyleTraits ?? []),
  ]);

  const selfHighlights = dedupe([
    ...selfFromChips,
    ...selfFromSignals,
    ...selfFromTags,
  ]).slice(0, 3);

  // ── Partner highlights ───────────────────────────────────────────────────────
  const partnerFromChips = (ev.chips?.partner ?? [])
    .slice(0, 3)
    .map((c) => c.label)
    .filter(Boolean);

  const partnerFromAttractionTraits = topAttractionLabels(
    ev.extendedSignals?.attractionTraits?.attraction,
    3,
  );

  const partnerFromPreferences = (ev.extendedSignals?.preferences ?? []).slice(
    0,
    3,
  );

  const partnerHighlights = dedupe([
    ...partnerFromChips,
    ...partnerFromAttractionTraits,
    ...partnerFromPreferences,
  ]).slice(0, 3);

  // ── Missing pieces ───────────────────────────────────────────────────────────
  const thinProfile =
    selfHighlights.length < 2 && partnerHighlights.length < 2;
  const missingPieces =
    isSparse || thinProfile ? FILL_IN_PROMPTS.slice(0, 3) : [];

  return {
    heroTitle: HERO_TITLE,
    heroSubtitle,
    note,
    selfHighlights,
    partnerHighlights,
    missingPieces,
    isSparse,
  };
}
