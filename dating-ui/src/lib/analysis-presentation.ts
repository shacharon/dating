/**
 * Presentation mapper for profile analysis results (hub Analysis tab).
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
  display?: {
    overallNarrative?: string;
    aboutMeInsight?: string;
    relationshipInsight?: string;
    partnerInsight?: string;
    missingPrompts?: string[];
    summary?: string;
    insight?: string;
    note?: string;
  };
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
  /** Narrative intro from new display fields (or legacy summary fallback). */
  heroSubtitle: string | null;
  /** Warm helper note only (never raw technical confidence text). */
  note: string | null;
  /** About-me insight for the compact card. */
  aboutMeInsight: string;
  /** Relationship-style insight paragraph. */
  relationshipInsight: string;
  /** Partner-preference insight for the compact card. */
  partnerPreferenceInsight: string;
  /** Up to 3 self-trait labels (chips-first, then signal keys, then value tags). */
  selfHighlights: string[];
  /** Up to 3 partner-preference labels (chips-first, then attraction traits). */
  partnerHighlights: string[];
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

const HERO_TITLE = 'Your analysis';
const SPARSE_NOTE =
  'Light on detail. A few more lines in your profile will sharpen this read.';
const CLINICAL_BLOCKLIST = [
  'limited information',
  'insufficient evidence',
  'individual',
  'ascertain',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    if (!s || seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

function sanitizeUserFacingText(value: string | null | undefined): string | null {
  const t = value?.trim();
  if (!t) return null;
  const lowered = t.toLowerCase();
  if (CLINICAL_BLOCKLIST.some((bad) => lowered.includes(bad))) return null;
  return t;
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
  const overallNarrative = sanitizeUserFacingText(
    ev.display?.overallNarrative ?? ev.display?.summary,
  );
  const aboutMeInsight = sanitizeUserFacingText(ev.display?.aboutMeInsight);
  const relationshipInsight = sanitizeUserFacingText(
    ev.display?.relationshipInsight ?? ev.display?.insight,
  );
  const partnerInsight = sanitizeUserFacingText(ev.display?.partnerInsight);
  const heroSubtitle = overallNarrative ?? null;
  const note = isSparse ? SPARSE_NOTE : null;

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
    ...(aboutMeInsight ? [aboutMeInsight] : []),
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
    ...(partnerInsight ? [partnerInsight] : []),
    ...partnerFromChips,
    ...partnerFromAttractionTraits,
    ...partnerFromPreferences,
  ]).slice(0, 3);

  return {
    heroTitle: HERO_TITLE,
    heroSubtitle,
    note,
    aboutMeInsight:
      aboutMeInsight ??
      selfHighlights[0] ??
      "Not enough written signal yet—add to About me and we'll reflect you more accurately.",
    relationshipInsight:
      relationshipInsight ??
      'Relationship style reads thin—say more about how you like to connect.',
    partnerPreferenceInsight:
      partnerInsight ??
      partnerHighlights[0] ??
      'Partner preference reads thin—say more about who fits you.',
    selfHighlights,
    partnerHighlights,
    isSparse,
  };
}
