import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals, LLMUsageStats } from '../extraction/extracted-signals.interface';
import {
  OFFICIAL_EXTRACTION_SIGNAL_KEYS,
  effectiveDomainQualityStatus,
} from '../extraction/extracted-signals.interface';
import type { RawInterests } from '../extraction/extracted-interests.interface';
import { LLMRouterService } from '../llm/llm-router.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import type { CompatibilityResult } from '../compatibility/compatibility-score';
import { computeCompatibility } from '../compatibility/compatibility-score';
import {
  detectLifestyleConflicts,
  type LifestyleConflictsResult,
} from '../compatibility/lifestyle-conflicts';
import type { ProductScores } from '../domain/scoring/product-scores.types';
import { buildChips, type Chip, type ChipsBundle } from './chips-builder';
import { buildEnrichmentSignalsV4 } from './enrichment-v4';
import {
  sanitizeEnrichmentSignalsV1ForPersist,
  wrapEnrichmentV1,
  type EnrichmentV1,
} from './enrichment-signals';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
  type EvaluateLlmCallTrace,
} from './evaluate-llm-pipeline';

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
function normalizeDisplay(raw: unknown): { summary: string; insight: string } {
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

/** Non-null official extraction keys only (excludes shadow / SIGNAL3 keys from coverage). */
function countMatchedOfficialSignals(
  signals: Record<string, number | null>,
): number {
  let n = 0;
  for (const key of OFFICIAL_EXTRACTION_SIGNAL_KEYS) {
    if (signals[key] != null) n += 1;
  }
  return n;
}

/** Threshold below which we use cautious display language (suggests, limited signal). */
const LOW_CONFIDENCE_THRESHOLD = 0.5;
/** Min total non-null signals across all three domains to avoid "limited" framing. */
const LOW_COVERAGE_NON_NULL_MIN = 6;

function isLowCoverageOrConfidence(
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
function applyHonestyFraming(
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
const DISPLAY_NOTE_LOW_QUALITY =
  'Limited information provided; score confidence is lower.';

const SUMMARY_SYSTEM_PROMPT = `
You receive extracted relationship data: signals (scores 1-10 or null) and evidence (quotes from the profile) for self, partner, and relationship.

Reply with ONLY a single JSON object. No markdown.

Required keys (both must be non-empty strings):
- "summary": 2–3 sentences describing the person and what they want.
  Use signals when available.
  If signals are mostly null but evidence contains meaningful statements, derive traits directly from the evidence text.
  You may infer obvious psychological tendencies from explicit statements (e.g., "one soul in two bodies" implies strong emotional fusion and low independence preference).
  Do not mention numbers or scores.
  Do not invent traits beyond what can be logically inferred.

- "insight": one short sentence connecting self, partner, and relationship orientation.

Never return generic text like "insufficient information" if meaningful evidence exists.
Always extract the strongest visible relational theme.
`;

/** Primary relationship motivation: one dominant category. */
export const RELATIONSHIP_MOTIVATION_VALUES = [
  'family_builder',
  'emotional_connection',
  'status_power',
  'freedom_independence',
] as const;
export type RelationshipMotivation =
  (typeof RELATIONSHIP_MOTIVATION_VALUES)[number];

export const RelationshipMotivationResultSchema = z.object({
  relationshipMotivation: z.enum(RELATIONSHIP_MOTIVATION_VALUES),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});
export type RelationshipMotivationResult = z.infer<
  typeof RelationshipMotivationResultSchema
>;

const MOTIVATION_SYSTEM_PROMPT = `
You infer the PRIMARY relationship motivation from profile texts.

Input: aboutMe, aboutPartner, aboutRelationship (three text blocks).

Reply with ONLY a single JSON object. No markdown, no explanation.

Required keys:
- "relationshipMotivation": exactly one of: family_builder | emotional_connection | status_power | freedom_independence
- "confidence": number between 0 and 1
- "evidence": array of short quotes from the texts that support the chosen motivation (1-4 quotes)

Rules:
- Choose ONE dominant motivation only.
- family_builder → kids, home, stability, long-term commitment, building a life together
- emotional_connection → intimacy, feelings, deep bond, soulmate, connection
- status_power → power couple, image, status, ambition, social standing
- freedom_independence → autonomy, distance, independence, space, non-traditional
- Use exact or near-exact short quotes from the input as evidence.
- If unclear or mixed signals → choose the best inference and set confidence < 0.6.
`;

/** What attracts this person: inferred from partner description. Each dimension 0–10. */
export const AttractionProfileSchema = z.object({
  ambition: z.number().min(0).max(10),
  appearance: z.number().min(0).max(10),
  kindness: z.number().min(0).max(10),
  status: z.number().min(0).max(10),
  stability: z.number().min(0).max(10),
});
export type AttractionProfile = z.infer<typeof AttractionProfileSchema>;

export const AttractionResultSchema = z.object({
  attractionProfile: AttractionProfileSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).default([]),
});
export type AttractionResult = z.infer<typeof AttractionResultSchema>;

const ATTRACTION_SYSTEM_PROMPT = `
You infer what attracts this person based on how they describe their ideal partner.

Input: aboutMe, aboutPartner (two text blocks). Focus on the "aboutPartner" (ideal partner) description.

Reply with ONLY a single JSON object. No markdown, no explanation.

Required keys:
- "attractionProfile": object with exactly these keys, each a number 0–10:
  - "ambition": how much they are attracted to drive/achievement (0 = not mentioned, 10 = central)
  - "appearance": how much they emphasize looks/physical attraction (0 = not mentioned, 10 = central)
  - "kindness": how much they value warmth/kindness (0 = not mentioned, 10 = central)
  - "status": how much they value image/prestige/elite (0 = not mentioned, 10 = central)
  - "stability": how much they value family/stable home (0 = not mentioned, 10 = central)
- "confidence": number between 0 and 1 (overall confidence in the inference)
- "evidence": array of short quotes from the input that support the scores (optional but helpful)

Mapping hints:
- "successful / high achiever / driven / ambitious" → ambition
- "beautiful / attractive / appearance / looks" → appearance
- "kind / warm / caring / gentle" → kindness
- "image / prestige / elite / status" → status
- "family / stable home / settled / reliable" → stability

If a dimension is not mentioned, use 0. Use 0–10 to reflect strength of emphasis.
`;

/** Attraction traits (9 dimensions, integers 0–10). Primary source: aboutPartner. */
export const ATTRACTION_TRAITS_KEYS = [
  'ambition',
  'statusOrientation',
  'physicalPriority',
  'kindnessWarmth',
  'stabilityReliability',
  'independenceAutonomy',
  'emotionalDepth',
  'traditionalismValues',
  'financialPrudence',
] as const;

export const AttractionTraitsSchema = z.object({
  ambition: z.number().min(0).max(10),
  statusOrientation: z.number().min(0).max(10),
  physicalPriority: z.number().min(0).max(10),
  kindnessWarmth: z.number().min(0).max(10),
  stabilityReliability: z.number().min(0).max(10),
  independenceAutonomy: z.number().min(0).max(10),
  emotionalDepth: z.number().min(0).max(10),
  traditionalismValues: z.number().min(0).max(10),
  financialPrudence: z.number().min(0).max(10),
});
export type AttractionTraits = z.infer<typeof AttractionTraitsSchema>;

export const AttractionTraitsEvidenceItemSchema = z.object({
  dimension: z.string(),
  quote: z.string(),
});

export const AttractionTraitsResultSchema = z.object({
  attraction: AttractionTraitsSchema,
  confidence: z.number().min(0).max(1),
  evidence: z.array(AttractionTraitsEvidenceItemSchema).default([]),
});
export type AttractionTraitsResult = z.infer<typeof AttractionTraitsResultSchema>;

const ATTRACTION_TRAITS_SYSTEM_PROMPT = `
You are a strict feature-extractor. Output JSON only. No prose.

TASK: Given profile text, infer what traits this person is attracted to in a partner.

OUTPUT JSON SCHEMA (exact keys):
{
  "attraction": {
    "ambition": 0-10,
    "statusOrientation": 0-10,
    "physicalPriority": 0-10,
    "kindnessWarmth": 0-10,
    "stabilityReliability": 0-10,
    "independenceAutonomy": 0-10,
    "emotionalDepth": 0-10,
    "traditionalismValues": 0-10,
    "financialPrudence": 0-10
  },
  "confidence": 0-1,
  "evidence": [
    { "dimension": "string", "quote": "string" }
  ]
}

RULES:
- Primary source is aboutPartner. Use aboutMe/aboutRelationship only if aboutPartner is thin.
- Use integers only (no decimals). Always fill every dimension (never null).
- If unclear: set 5 and lower confidence.
- Evidence: 1-4 items, each quote <= 12 words, copied from input text.
- Map hints:
  - "high-achiever / ambition" -> ambition
  - "image / dress code / etiquette" -> statusOrientation
  - "appearance / looks" -> physicalPriority
  - "kind / warm" -> kindnessWarmth
  - "stable / reliable / responsible" -> stabilityReliability
  - "independent / okay with schedule" -> independenceAutonomy
  - "deep / emotionally available" -> emotionalDepth
  - "traditional / values / kosher" -> traditionalismValues
  - "save / invest / not spender" -> financialPrudence
`;

/** Product/UI flags for calibration and testing. */
export type EvaluateFlag =
  | 'LOW_COVERAGE'
  | 'LOW_CONFIDENCE'
  | 'HIGH_FRICTION_RISK';

export type { ProductScores } from '../domain/scoring/product-scores.types';

/** UI-safe product score cell: numeric value or withheld (do not show as 0%). */
export type ProductScorePresentationValue =
  | { kind: 'numeric'; value: number }
  | { kind: 'insufficient_data' };

export interface ProductScoresPresentation {
  partnerFitScore: ProductScorePresentationValue;
  relationshipFitScore: ProductScorePresentationValue;
  coverageScore: ProductScorePresentationValue;
  frictionRiskScore: ProductScorePresentationValue;
  overallDecisionScore: ProductScorePresentationValue;
}

function buildProductScoresPresentation(
  scores: ProductScores,
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
): ProductScoresPresentation {
  const sOk = effectiveDomainQualityStatus(self) === 'OK';
  const pOk = effectiveDomainQualityStatus(partner) === 'OK';
  const rOk = effectiveDomainQualityStatus(relationship) === 'OK';

  const num = (v: number): ProductScorePresentationValue => ({
    kind: 'numeric',
    value: Math.round(v),
  });
  const ins: ProductScorePresentationValue = { kind: 'insufficient_data' };

  return {
    partnerFitScore: sOk && pOk ? num(scores.partnerFitScore) : ins,
    relationshipFitScore: sOk && rOk ? num(scores.relationshipFitScore) : ins,
    coverageScore: sOk && pOk && rOk ? num(scores.coverageScore) : ins,
    frictionRiskScore: num(scores.frictionRiskScore),
    overallDecisionScore: sOk && pOk && rOk ? num(scores.overallDecisionScore) : ins,
  };
}

/**
 * v1 extended signals: additive sidecar under evaluation.extendedSignals.
 * Explicit-list fields are capped at 5 items each, deduped semantically and across categories.
 */
export interface ExtendedSignals {
  version: 'v1';
  relationshipMotivation?: RelationshipMotivationResult;
  attractionTraits?: AttractionTraitsResult;
  interests: string[];
  lifestyleTraits: string[];
  preferences: string[];
  boundaries: string[];
  values: string[];
  _usage?: LLMUsageStats;
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
    { value: 'gym', semanticId: 'activity-gym', patterns: [/\bgym\b/i, /\bweightlifting\b/i] },
    { value: 'running', semanticId: 'activity-running', patterns: [/\brunning\b/i, /\bruns?\b/i] },
    { value: 'hiking', semanticId: 'activity-hiking', patterns: [/\bhiking\b/i, /\bhikes?\b/i] },
    { value: 'yoga', semanticId: 'activity-yoga', patterns: [/\byoga\b/i] },
    { value: 'cooking', semanticId: 'activity-cooking', patterns: [/\bcooking\b/i, /\bcooks at home\b/i] },
    { value: 'travel', semanticId: 'activity-travel', patterns: [/\btravel(?:ing|s)?\b/i, /\btravels?\b/i] },
    {
      value: 'reading',
      semanticId: 'activity-reading',
      patterns: [/\bI read\b/i, /\breading\b/i, /\bbooks?\b/i],
    },
    { value: 'music', semanticId: 'activity-music', patterns: [/\bmusic\b/i, /\bconcerts?\b/i] },
    { value: 'walking', semanticId: 'activity-walking', patterns: [/\bwalking\b/i, /\bwalks?\b/i] },
    { value: 'journaling', semanticId: 'activity-journaling', patterns: [/\bjournaling\b/i, /\bjournal(?:ing)?\b/i] },
    { value: 'swimming', semanticId: 'activity-swimming', patterns: [/\bswimming\b/i, /\bswims?\b/i] },
    { value: 'cycling', semanticId: 'activity-cycling', patterns: [/\bcycling\b/i, /\bbike rides?\b/i] },
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
      patterns: [/\brestoration\b/i, /\brestoring\b/i, /\bI restore\b/i, /\brestore old\b/i],
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
      patterns: [/\bstructured (?:life|routine|days?)\b/i, /\blike(?:s)? structure\b/i],
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
      patterns: [/\bvalues (?:freedom|independence|autonomy)\b/i, /\bfreedom and autonomy\b/i],
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
    { value: 'no games', semanticId: 'boundary-no-games', patterns: [/\bno games\b/i] },
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
      patterns: [/\bneed (?:my |a lot of )?space\b/i, /\bneed space\b/i, /\brespect.*space\b/i],
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
    { value: 'loyalty', semanticId: 'value-loyalty', patterns: [/\bloyal(?:ty)?\b/i] },
    { value: 'authenticity', semanticId: 'value-authenticity', patterns: [/\bauthentic(?:ity)?\b/i] },
    {
      value: 'faith or tradition',
      semanticId: 'value-faith-tradition',
      patterns: [/\bfaith\b/i, /\btradition(?:al)?\b/i, /\bspiritual practice\b/i],
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

function buildExplicitExtendedLists(
  aboutMe: string,
  aboutPartner: string,
  aboutRelationship: string,
): Pick<
  ExtendedSignals,
  'interests' | 'lifestyleTraits' | 'preferences' | 'boundaries' | 'values'
> {
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

/** Deterministic product score bundle from compatibility + extraction. All scores 0–100. */
function computeProductScores(
  self: ExtractedSignals,
  partner: ExtractedSignals,
  relationship: ExtractedSignals,
  selfVsPartner: CompatibilityResult,
  selfVsRelationship: CompatibilityResult,
): { productScores: ProductScores; flags: EvaluateFlag[] } {
  const partnerFitScore = Math.round(
    Math.max(0, Math.min(100, selfVsPartner.overallScore)),
  );
  const relationshipFitScore = Math.round(
    Math.max(0, Math.min(100, selfVsRelationship.overallScore)),
  );

  const totalKeys = 14 * 3;
  const matchedSignals =
    countMatchedOfficialSignals(self.signals) +
    countMatchedOfficialSignals(partner.signals) +
    countMatchedOfficialSignals(relationship.signals);
  const coveragePercentValue =
    totalKeys > 0 ? Math.round((100 * matchedSignals) / totalKeys) : 0;
  const coverageScore = Math.max(0, Math.min(100, coveragePercentValue));

  const totalHardMismatches =
    selfVsPartner.hardMismatches.length +
    selfVsRelationship.hardMismatches.length;
  const frictionRiskScore = Math.round(
    Math.max(0, Math.min(100, totalHardMismatches * 20)),
  );

  const avgConfidence =
    (self.confidence + partner.confidence + relationship.confidence) / 3;
  let overallDecisionScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        (partnerFitScore +
          relationshipFitScore +
          coverageScore +
          (100 - frictionRiskScore)) /
          4,
      ),
    ),
  );

  /** v1 gating: low coverage cannot produce a misleadingly confident overall score. */
  if (coverageScore < 40) {
    overallDecisionScore = Math.min(overallDecisionScore, 49);
  } else if (coverageScore < 55) {
    overallDecisionScore = Math.min(overallDecisionScore, 64);
  }

  const productScores: ProductScores = {
    partnerFitScore,
    relationshipFitScore,
    coverageScore,
    frictionRiskScore,
    overallDecisionScore,
    policyVersion: 'product-score-v1',
    debug: {
      totalHardMismatches,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      totalNonNullSignals: matchedSignals,
    },
  };

  const flags: EvaluateFlag[] = [];
  if (coverageScore < 50 || matchedSignals < 6) flags.push('LOW_COVERAGE');
  if (avgConfidence < LOW_CONFIDENCE_THRESHOLD) flags.push('LOW_CONFIDENCE');
  if (frictionRiskScore >= 60) flags.push('HIGH_FRICTION_RISK');

  return { productScores, flags };
}

export interface EvaluateBatchInput {
  aboutMe: string;
  aboutRelationship: string;
  aboutPartner: string;
  modelKey?: string;
  temperature?: number;
  /** Optional profile id for extraction patches (e.g. SPARSE_PROFILE null-only recovery). */
  profileId?: string;
  /** Optional raw interests for chips generation (display-only). */
  rawInterests?: RawInterests;
}

export type { Chip, ChipsBundle } from './chips-builder';

export interface EvaluateBatchResult {
  self: ExtractedSignals;
  partner: ExtractedSignals;
  relationship: ExtractedSignals;
  compatibility: {
    selfVsPartner: CompatibilityResult;
    selfVsRelationship: CompatibilityResult;
  };
  display: {
    summary: string;
    insight: string;
    /** Present when LOW_COVERAGE or LOW_CONFIDENCE; UI-safe honesty note. */
    note?: string;
  };
  productScores: ProductScores;
  /** Display mapping: use instead of raw productScores when rendering (avoids false zeros). */
  productScoresPresentation: ProductScoresPresentation;
  flags: EvaluateFlag[];
  _usage?: LLMUsageStats;
  /** v1 extended signals: additive sidecar, does not affect scoring. */
  extendedSignals?: ExtendedSignals;
  /** Display chips for UI explainability (read-only, no scoring impact). */
  chips?: ChipsBundle;
  /**
   * Additive text-derived signals only; never used for scoring, matching, or core extraction.
   * Omitted on legacy stored evaluations until re-run.
   */
  enrichment?: EnrichmentV1;
  /** Raw LLM payloads + post-process stage diffs for evaluate-time LLM calls (observability only). */
  _evaluateLlmTraces?: {
    evalRequestId: string;
    summary?: EvaluateLlmCallTrace;
    relationshipMotivation?: EvaluateLlmCallTrace;
    attractionTraits?: EvaluateLlmCallTrace;
  };
}

@Injectable()
export class EvaluateService {
  constructor(
    private readonly extractionService: ExtractionService,
    private readonly llm: LLMRouterService,
    private readonly logger: SimpleLogger,
  ) {}

  /**
   * Generate display summary and insight from the three extracted signal sets only.
   * Does not re-analyze original text. No numeric scores in output. No hallucinated traits.
   */
  private async generateSummaryFromSignals(
    self: ExtractedSignals,
    partner: ExtractedSignals,
    relationship: ExtractedSignals,
  ): Promise<{
    summary: string;
    insight: string;
    _evaluateLlmTrace: EvaluateLlmCallTrace;
  }> {
    const payload = JSON.stringify(
      {
        self: {
          signals: self.signals,
          evidence: self.evidence,
          confidence: self.confidence,
        },
        partner: {
          signals: partner.signals,
          evidence: partner.evidence,
          confidence: partner.confidence,
        },
        relationship: {
          signals: relationship.signals,
          evidence: relationship.evidence,
          confidence: relationship.confidence,
        },
      },
      null,
      2,
    );

    const requestId = randomUUID();
    const { value, rawText } = await this.llm.completeJSON<Record<string, unknown>>({
      modelKey: 'fast',
      system: SUMMARY_SYSTEM_PROMPT,
      user: `Extracted data:\n${payload}`,
      schema: z.any(),
      temperature: 0.3,
      maxTokens: 3000,
      timeoutMs: 20_000,
      requestId,
      purpose: 'evaluate-summary',
    });

    this.logger.log(
      JSON.stringify(
        buildEvaluateRawLlmLogPayload({ purpose: 'evaluate-summary', requestId }, value, rawText),
      ),
      'EvaluateService',
    );

    const normalized = normalizeDisplay(value);
    const trace = buildEvaluateLlmTrace({
      purpose: 'evaluate-summary',
      requestId,
      parsedJson: value,
      rawText,
      afterStages: [{ name: 'after_normalizeDisplay', value: normalized }],
    });
    this.logger.log(
      JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
      'EvaluateService',
    );

    return { ...normalized, _evaluateLlmTrace: trace };
  }

  /**
   * Infer primary relationship motivation from the three profile texts.
   * Returns one dominant motivation, confidence 0–1, and evidence quotes.
   */
  async inferRelationshipMotivation(
    aboutMe: string,
    aboutPartner: string,
    aboutRelationship: string,
    opts?: { collectTrace?: boolean },
  ): Promise<
    RelationshipMotivationResult & { _evaluateLlmTrace?: EvaluateLlmCallTrace }
  > {
    const user = [
      'aboutMe:',
      aboutMe.trim() || '(empty)',
      '',
      'aboutPartner:',
      aboutPartner.trim() || '(empty)',
      '',
      'aboutRelationship:',
      aboutRelationship.trim() || '(empty)',
    ].join('\n');

    const requestId = randomUUID();
    const { value, rawText } =
      await this.llm.completeJSON<RelationshipMotivationResult>({
        modelKey: 'fast',
        system: MOTIVATION_SYSTEM_PROMPT,
        user,
        schema: RelationshipMotivationResultSchema,
        temperature: 0.2,
        maxTokens: 500,
        timeoutMs: 15_000,
        requestId,
        purpose: 'evaluate-motivation',
      });

    this.logger.log(
      JSON.stringify(
        buildEvaluateRawLlmLogPayload({ purpose: 'evaluate-motivation', requestId }, value, rawText),
      ),
      'EvaluateService',
    );

    const out: RelationshipMotivationResult = {
      relationshipMotivation: value.relationshipMotivation,
      confidence: Math.max(0, Math.min(1, value.confidence)),
      evidence: Array.isArray(value.evidence) ? value.evidence : [],
    };
    const trace = buildEvaluateLlmTrace({
      purpose: 'evaluate-motivation',
      requestId,
      parsedJson: value,
      rawText,
      afterStages: [{ name: 'after_clamp_and_normalize', value: out }],
    });
    this.logger.log(
      JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
      'EvaluateService',
    );
    if (opts?.collectTrace) {
      return { ...out, _evaluateLlmTrace: trace };
    }
    return out;
  }

  /**
   * Infer what attracts this person from aboutMe and aboutPartner (partner description).
   * Returns attractionProfile (ambition, appearance, kindness, status, stability 0–10), confidence, evidence.
   */
  async inferAttractionProfile(
    aboutMe: string,
    aboutPartner: string,
    opts?: { collectTrace?: boolean },
  ): Promise<AttractionResult & { _evaluateLlmTrace?: EvaluateLlmCallTrace }> {
    const user = [
      'aboutMe:',
      aboutMe.trim() || '(empty)',
      '',
      'aboutPartner (ideal partner description):',
      aboutPartner.trim() || '(empty)',
    ].join('\n');

    const requestId = randomUUID();
    const { value, rawText } = await this.llm.completeJSON<AttractionResult>({
      modelKey: 'fast',
      system: ATTRACTION_SYSTEM_PROMPT,
      user,
      schema: AttractionResultSchema,
      temperature: 0.2,
      maxTokens: 500,
      timeoutMs: 15_000,
      requestId,
      purpose: 'evaluate-attraction',
    });

    this.logger.log(
      JSON.stringify(
        buildEvaluateRawLlmLogPayload({ purpose: 'evaluate-attraction', requestId }, value, rawText),
      ),
      'EvaluateService',
    );

    const clamp = (n: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, n));
    const out: AttractionResult = {
      attractionProfile: {
        ambition: clamp(value.attractionProfile.ambition, 0, 10),
        appearance: clamp(value.attractionProfile.appearance, 0, 10),
        kindness: clamp(value.attractionProfile.kindness, 0, 10),
        status: clamp(value.attractionProfile.status, 0, 10),
        stability: clamp(value.attractionProfile.stability, 0, 10),
      },
      confidence: Math.max(0, Math.min(1, value.confidence)),
      evidence: Array.isArray(value.evidence) ? value.evidence : [],
    };
    const trace = buildEvaluateLlmTrace({
      purpose: 'evaluate-attraction',
      requestId,
      parsedJson: value,
      rawText,
      afterStages: [{ name: 'after_clamp_and_normalize', value: out }],
    });
    this.logger.log(
      JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
      'EvaluateService',
    );
    if (opts?.collectTrace) {
      return { ...out, _evaluateLlmTrace: trace };
    }
    return out;
  }

  /**
   * Infer attraction traits (9 dimensions) from aboutPartner; optionally use aboutMe/aboutRelationship if aboutPartner is thin.
   * Returns attraction (integers 0–10), confidence, evidence with dimension+quote.
   */
  async inferAttractionTraits(
    aboutPartner: string,
    aboutMe?: string,
    aboutRelationship?: string,
    opts?: { collectTrace?: boolean },
  ): Promise<
    AttractionTraitsResult & { _evaluateLlmTrace?: EvaluateLlmCallTrace }
  > {
    const parts: string[] = ['aboutPartner:', aboutPartner.trim() || '(empty)'];
    if (aboutMe != null && aboutMe.trim()) {
      parts.push('', '(optional) aboutMe:', aboutMe.trim());
    }
    if (aboutRelationship != null && aboutRelationship.trim()) {
      parts.push('', '(optional) aboutRelationship:', aboutRelationship.trim());
    }
    const user = parts.join('\n');

    const requestId = randomUUID();
    const { value, rawText } = await this.llm.completeJSON<AttractionTraitsResult>({
      modelKey: 'fast',
      system: ATTRACTION_TRAITS_SYSTEM_PROMPT,
      user,
      schema: AttractionTraitsResultSchema,
      temperature: 0.2,
      maxTokens: 600,
      timeoutMs: 15_000,
      requestId,
      purpose: 'evaluate-attraction-traits',
      latencyStage: 'eval_traits',
      inputTextLength:
        (aboutPartner?.trim().length ?? 0) +
        (aboutMe?.trim().length ?? 0) +
        (aboutRelationship?.trim().length ?? 0),
    });

    this.logger.log(
      JSON.stringify(
        buildEvaluateRawLlmLogPayload(
          { purpose: 'evaluate-attraction-traits', requestId },
          value,
          rawText,
        ),
      ),
      'EvaluateService',
    );

    const clampInt = (n: number, lo: number, hi: number) =>
      Math.round(Math.max(lo, Math.min(hi, n)));
    const a = value.attraction;
    const evidence = Array.isArray(value.evidence)
      ? value.evidence.map((e) => ({
          dimension: typeof e.dimension === 'string' ? e.dimension : String(e.dimension ?? ''),
          quote: typeof e.quote === 'string' ? e.quote.slice(0, 200) : String(e.quote ?? ''),
        }))
      : [];

    const out: AttractionTraitsResult = {
      attraction: {
        ambition: clampInt(a.ambition, 0, 10),
        statusOrientation: clampInt(a.statusOrientation, 0, 10),
        physicalPriority: clampInt(a.physicalPriority, 0, 10),
        kindnessWarmth: clampInt(a.kindnessWarmth, 0, 10),
        stabilityReliability: clampInt(a.stabilityReliability, 0, 10),
        independenceAutonomy: clampInt(a.independenceAutonomy, 0, 10),
        emotionalDepth: clampInt(a.emotionalDepth, 0, 10),
        traditionalismValues: clampInt(a.traditionalismValues, 0, 10),
        financialPrudence: clampInt(a.financialPrudence, 0, 10),
      },
      confidence: Math.max(0, Math.min(1, value.confidence)),
      evidence,
    };
    const trace = buildEvaluateLlmTrace({
      purpose: 'evaluate-attraction-traits',
      requestId,
      parsedJson: value,
      rawText,
      afterStages: [{ name: 'after_clamp_and_truncate', value: out }],
    });
    this.logger.log(
      JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
      'EvaluateService',
    );
    if (opts?.collectTrace) {
      return { ...out, _evaluateLlmTrace: trace };
    }
    return out;
  }

  /**
   * Detect structural lifestyle conflicts between two profiles' signal maps.
   * Deterministic rules (pace, status, socialBattery, independence, Tier1 values).
   */
  detectLifestyleConflicts(
    signalsA: Record<string, number | null>,
    signalsB: Record<string, number | null>,
  ): LifestyleConflictsResult {
    return detectLifestyleConflicts(signalsA, signalsB);
  }

  async evaluateBatch(
    input: EvaluateBatchInput,
  ): Promise<{ ok: true; result: EvaluateBatchResult }> {
    const { aboutMe, aboutRelationship, aboutPartner, profileId, rawInterests } = input;
    const evalRequestId = randomUUID();
    const evalStartedAt = Date.now();

    const { self, relationship, partner, _usage } =
      await this.extractionService.extractAllThree(
        aboutMe.trim(),
        aboutRelationship.trim(),
        aboutPartner.trim(),
        profileId,
      );

    // Start all evaluation LLM calls together (summary + optional extended signals).
    const displayPromise = this.generateSummaryFromSignals(self, partner, relationship);
    const extendedSignalsPromise = (async (): Promise<
      | (Pick<ExtendedSignals, 'relationshipMotivation' | 'attractionTraits'> & {
          motTrace?: EvaluateLlmCallTrace;
          attTrace?: EvaluateLlmCallTrace;
        })
      | undefined
    > => {
      try {
        const [motivationPack, attractionPack] = await Promise.all([
          this.inferRelationshipMotivation(
            aboutMe.trim(),
            aboutPartner.trim(),
            aboutRelationship.trim(),
            { collectTrace: true },
          ),
          this.inferAttractionTraits(
            aboutPartner.trim(),
            aboutMe.trim(),
            aboutRelationship.trim(),
            { collectTrace: true },
          ),
        ]);
        const {
          _evaluateLlmTrace: motTrace,
          ...motivation
        } = motivationPack;
        const {
          _evaluateLlmTrace: attTrace,
          ...attraction
        } = attractionPack;

        return {
          relationshipMotivation: motivation,
          attractionTraits: attraction,
          motTrace,
          attTrace,
        };
      } catch (err) {
        // Extended signals are optional; do not fail the entire evaluation if they fail
        this.logger.warn(
          `Extended signals inference failed: ${err instanceof Error ? err.message : String(err)}`,
          'EvaluateService',
        );
        return undefined;
      }
    })();

    const [displayPack, selfVsPartner, selfVsRelationship] = await Promise.all([
      displayPromise,
      Promise.resolve(
        computeCompatibility(
          self.signals as Parameters<typeof computeCompatibility>[0],
          partner.signals as Parameters<typeof computeCompatibility>[1],
        ),
      ),
      Promise.resolve(
        computeCompatibility(
          self.signals as Parameters<typeof computeCompatibility>[0],
          relationship.signals as Parameters<typeof computeCompatibility>[1],
        ),
      ),
    ]);

    const {
      summary: summaryPre,
      insight: insightPre,
      _evaluateLlmTrace: summaryLlmTrace,
    } = displayPack;

    const useCautious = isLowCoverageOrConfidence(self, partner, relationship);
    const { summary, insight } = applyHonestyFraming(
      summaryPre,
      insightPre,
      useCautious,
    );

    const { productScores, flags } = computeProductScores(
      self,
      partner,
      relationship,
      selfVsPartner,
      selfVsRelationship,
    );
    const productScoresPresentation = buildProductScoresPresentation(
      productScores,
      self,
      partner,
      relationship,
    );

    const displayNote =
      flags.includes('LOW_COVERAGE') || flags.includes('LOW_CONFIDENCE')
        ? DISPLAY_NOTE_LOW_QUALITY
        : undefined;

    // Await optional extended signals that started in parallel with summary.
    const inferredExtendedSignals = await extendedSignalsPromise;
    const explicitExtendedLists = buildExplicitExtendedLists(
      aboutMe.trim(),
      aboutPartner.trim(),
      aboutRelationship.trim(),
    );
    const extendedSignals: ExtendedSignals = {
      version: 'v1',
      ...explicitExtendedLists,
      ...(inferredExtendedSignals?.relationshipMotivation && {
        relationshipMotivation: inferredExtendedSignals.relationshipMotivation,
      }),
      ...(inferredExtendedSignals?.attractionTraits && {
        attractionTraits: inferredExtendedSignals.attractionTraits,
      }),
    };
    this.logger.log(
      JSON.stringify({
        event: 'eval_parallel_done',
        durationMs: Date.now() - evalStartedAt,
        requestId: evalRequestId,
      }),
      'EvaluateService',
    );

    // Build display chips (deterministic, read-only, no scoring impact)
    const chips = buildChips(
      self,
      partner,
      relationship,
      rawInterests,
      extendedSignals,
    );

    const enrichmentMapped = buildEnrichmentSignalsV4(
      aboutMe.trim(),
      aboutPartner.trim(),
      aboutRelationship.trim(),
    );
    const enrichmentSignals = sanitizeEnrichmentSignalsV1ForPersist(enrichmentMapped, {
      profileId: profileId ?? null,
      onDropped: (e) =>
        this.logger.warn(JSON.stringify({ event: 'enrichment_field_dropped', ...e }), EvaluateService.name),
    });
    const enrichment: EnrichmentV1 = wrapEnrichmentV1(enrichmentSignals);

    return {
      ok: true,
      result: {
        self,
        partner,
        relationship,
        compatibility: {
          selfVsPartner,
          selfVsRelationship,
        },
        display: {
          summary,
          insight,
          ...(displayNote && { note: displayNote }),
        },
        productScores,
        productScoresPresentation,
        flags,
        _usage,
        extendedSignals,
        chips,
        enrichment,
        _evaluateLlmTraces: {
          evalRequestId,
          summary: summaryLlmTrace,
          ...(inferredExtendedSignals?.motTrace && {
            relationshipMotivation: inferredExtendedSignals.motTrace,
          }),
          ...(inferredExtendedSignals?.attTrace && {
            attractionTraits: inferredExtendedSignals.attTrace,
          }),
        },
      },
    };
  }
}
