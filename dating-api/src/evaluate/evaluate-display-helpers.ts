import type { ExtractedSignals } from '../extraction/extracted-signals.interface';

/** Threshold below which we use cautious display language (suggests, limited signal). */
const LOW_CONFIDENCE_THRESHOLD = 0.5;
/** Min total non-null signals across all three domains to avoid "limited" framing. */
const LOW_COVERAGE_NON_NULL_MIN = 6;

function takeString(v: unknown, ...keys: string[]): string {
  const obj = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === 'string' && val.trim().length > 0) return val.trim();
    if (typeof val === 'number') return String(val);
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string')
      return val[0].trim();
  }
  return '';
}

function takeStringArray(v: unknown, ...keys: string[]): string[] {
  const obj = v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  for (const key of keys) {
    const val = obj[key];
    if (!Array.isArray(val)) continue;
    const out = val
      .filter((x): x is string => typeof x === 'string')
      .map((x) => x.trim())
      .filter(Boolean);
    if (out.length > 0) return out;
  }
  return [];
}

export type NormalizedDisplay = {
  overallNarrative: string;
  aboutMeInsight: string;
  relationshipInsight: string;
  partnerInsight: string;
  missingPrompts: string[];
  /** Legacy compatibility field; mirrors overallNarrative. */
  summary: string;
  /** Legacy compatibility field; mirrors relationshipInsight. */
  insight: string;
};

/** Normalize raw LLM output; accept common key variants and provide sensible fallbacks. */
export function normalizeDisplay(raw: unknown): NormalizedDisplay {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const overallNarrative =
    takeString(obj, 'overallNarrative', 'summary', 'Summary') ||
    'You have a thoughtful profile with a clear direction for connection.';
  const aboutMeInsight =
    takeString(obj, 'aboutMeInsight', 'selfInsight') ||
    'You come across as reflective and intentional in how you describe yourself.';
  const relationshipInsight =
    takeString(obj, 'relationshipInsight', 'insight', 'Insight') ||
    'You seem to value emotional clarity and a relationship that feels steady and real.';
  const partnerInsight =
    takeString(obj, 'partnerInsight') ||
    'You are drawn to a partner who feels warm, grounded, and aligned with your values.';
  const missingPrompts =
    takeStringArray(obj, 'missingPrompts').slice(0, 4) || [];
  const safeMissingPrompts =
    missingPrompts.length >= 2
      ? missingPrompts
      : [
          'What kind of day-to-day relationship dynamic helps you feel most connected?',
          'When conflict happens, what response helps you feel respected and safe?',
        ];
  return {
    overallNarrative,
    aboutMeInsight,
    relationshipInsight,
    partnerInsight,
    missingPrompts: safeMissingPrompts,
    summary: overallNarrative,
    insight: relationshipInsight,
  };
}

export function isLowCoverageOrConfidence(
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
): boolean {
  const totalNonNull =
    Object.values(self.signals).filter((v) => v != null).length +
    Object.values(partner.signals).filter((v) => v != null).length +
    Object.values(relationship.signals).filter((v) => v != null).length;
  const avgConfidence =
    (self.confidence + partner.confidence + relationship.confidence) / 3;
  return (
    avgConfidence < LOW_CONFIDENCE_THRESHOLD ||
    totalNonNull < LOW_COVERAGE_NON_NULL_MIN
  );
}

/** Soften summary/insight when coverage or confidence is low; avoid presenting inferred traits as facts. */
export function applyHonestyFraming(
  display: NormalizedDisplay,
  useCautious: boolean,
): NormalizedDisplay {
  if (!useCautious) return display;
  const narrativePrefix = 'Thanks for sharing. Here is a first take from what you wrote: ';
  const insightPrefix = 'From what you shared so far, ';
  const prompt = [
    'What would you love your future partner to understand about you early on?',
    'What kind of emotional tone helps a relationship feel right for you?',
  ];
  const prefixedOverallNarrative = display.overallNarrative.startsWith(narrativePrefix)
    ? display.overallNarrative
    : narrativePrefix + display.overallNarrative;
  const prefixedRelationshipInsight = display.relationshipInsight.startsWith(insightPrefix)
    ? display.relationshipInsight
    : insightPrefix + display.relationshipInsight;
  return {
    ...display,
    overallNarrative: prefixedOverallNarrative,
    relationshipInsight: prefixedRelationshipInsight,
    missingPrompts:
      display.missingPrompts.length >= 2 ? display.missingPrompts : prompt,
    summary: prefixedOverallNarrative,
    insight: prefixedRelationshipInsight,
  };
}

/** UI-safe note when data quality is low (no extra LLM call). */
export const DISPLAY_NOTE_LOW_QUALITY =
  'You can get sharper insights by adding a bit more detail to your profile text.';
