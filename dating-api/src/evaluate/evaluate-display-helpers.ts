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

/** Normalize raw LLM output; accept common key variants and provide sensible fallbacks. */
export function normalizeDisplay(raw: unknown): { summary: string; insight: string } {
  const obj =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const summary =
    takeString(obj, 'summary', 'Summary') ||
    'Profile and relationship view based on the extracted signals.';
  const insight =
    takeString(obj, 'insight', 'Insight') ||
    'Signals reflect how self, partner, and relationship preferences align.';
  return { summary, insight };
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
  summary: string,
  insight: string,
  useCautious: boolean,
): { summary: string; insight: string } {
  if (!useCautious) return { summary, insight };
  const summaryPrefix =
    'Based on limited information; the following may suggest tendencies rather than definitive traits. ';
  const insightPrefix = 'Limited signal; interpret with caution. ';
  return {
    summary: summary.startsWith(summaryPrefix)
      ? summary
      : summaryPrefix + summary,
    insight: insight.startsWith(insightPrefix)
      ? insight
      : insightPrefix + insight,
  };
}

/** UI-safe note when data quality is low (no extra LLM call). */
export const DISPLAY_NOTE_LOW_QUALITY =
  'Limited information provided; score confidence is lower.';
