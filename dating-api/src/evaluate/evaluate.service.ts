import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals, LLMUsageStats } from '../extraction/extracted-signals.interface';
import { LLMRouterService } from '../llm/llm-router.service';
import type { CompatibilityResult } from '../compatibility/compatibility-score';
import { computeCompatibility } from '../compatibility/compatibility-score';
import {
  detectLifestyleConflicts,
  type LifestyleConflictsResult,
} from '../compatibility/lifestyle-conflicts';
import type { ProductScores } from '../domain/scoring/product-scores.types';

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

/** POC/UI flags for calibration and testing. */
export type EvaluateFlag =
  | 'LOW_COVERAGE'
  | 'LOW_CONFIDENCE'
  | 'HIGH_FRICTION_RISK';

export type { ProductScores } from '../domain/scoring/product-scores.types';

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
  const totalNonNull =
    Object.values(self.signals).filter((v) => v != null).length +
    Object.values(partner.signals).filter((v) => v != null).length +
    Object.values(relationship.signals).filter((v) => v != null).length;
  const coverageRatio = totalKeys > 0 ? totalNonNull / totalKeys : 0;
  const coverageScore = Math.round(
    Math.max(0, Math.min(100, coverageRatio * 100)),
  );

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
      totalNonNullSignals: totalNonNull,
    },
  };

  const flags: EvaluateFlag[] = [];
  if (coverageScore < 50 || totalNonNull < 6) flags.push('LOW_COVERAGE');
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
}

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
  flags: EvaluateFlag[];
  _usage?: LLMUsageStats;
}

@Injectable()
export class EvaluateService {
  constructor(
    private readonly extractionService: ExtractionService,
    private readonly llm: LLMRouterService,
  ) {}

  /**
   * Generate display summary and insight from the three extracted signal sets only.
   * Does not re-analyze original text. No numeric scores in output. No hallucinated traits.
   */
  private async generateSummaryFromSignals(
    self: ExtractedSignals,
    partner: ExtractedSignals,
    relationship: ExtractedSignals,
  ): Promise<{ summary: string; insight: string }> {
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
    const { value } = await this.llm.completeJSON<Record<string, unknown>>({
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

    const normalized = normalizeDisplay(value);
    if (
      normalized.summary ===
        'Profile and relationship view based on the extracted signals.' &&
      normalized.insight ===
        'Signals reflect how self, partner, and relationship preferences align.'
    ) {
      return this.fallbackSummaryFromEvidence(self, partner, relationship);
    }
    return normalized;
  }

  /** Build a short summary and insight from evidence when the LLM returns nothing useful. */
  private fallbackSummaryFromEvidence(
    self: ExtractedSignals,
    partner: ExtractedSignals,
    relationship: ExtractedSignals,
  ): { summary: string; insight: string } {
    const quotes: string[] = [];
    for (const block of [self, partner, relationship]) {
      for (const e of block.evidence ?? []) {
        if (e.quote?.trim()) quotes.push(e.quote.trim());
      }
    }

    const summary =
      quotes.length > 0
        ? `Based on the profile: ${quotes.slice(0, 3).join('; ')}${quotes.length > 3 ? '...' : ''}`
        : 'Profile is brief; add more detail for a richer summary.';

    const insight =
      quotes.length > 0
        ? 'Summary is based on the quoted highlights from your self, partner, and relationship descriptions.'
        : 'Add more to each section to get a clearer picture.';

    return { summary, insight };
  }

  /**
   * Infer primary relationship motivation from the three profile texts.
   * Returns one dominant motivation, confidence 0–1, and evidence quotes.
   */
  async inferRelationshipMotivation(
    aboutMe: string,
    aboutPartner: string,
    aboutRelationship: string,
  ): Promise<RelationshipMotivationResult> {
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
    const { value } = await this.llm.completeJSON<RelationshipMotivationResult>({
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

    return {
      relationshipMotivation: value.relationshipMotivation,
      confidence: Math.max(0, Math.min(1, value.confidence)),
      evidence: Array.isArray(value.evidence) ? value.evidence : [],
    };
  }

  /**
   * Infer what attracts this person from aboutMe and aboutPartner (partner description).
   * Returns attractionProfile (ambition, appearance, kindness, status, stability 0–10), confidence, evidence.
   */
  async inferAttractionProfile(
    aboutMe: string,
    aboutPartner: string,
  ): Promise<AttractionResult> {
    const user = [
      'aboutMe:',
      aboutMe.trim() || '(empty)',
      '',
      'aboutPartner (ideal partner description):',
      aboutPartner.trim() || '(empty)',
    ].join('\n');

    const requestId = randomUUID();
    const { value } = await this.llm.completeJSON<AttractionResult>({
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

    const clamp = (n: number, lo: number, hi: number) =>
      Math.max(lo, Math.min(hi, n));
    return {
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
  }

  /**
   * Infer attraction traits (9 dimensions) from aboutPartner; optionally use aboutMe/aboutRelationship if aboutPartner is thin.
   * Returns attraction (integers 0–10), confidence, evidence with dimension+quote.
   */
  async inferAttractionTraits(
    aboutPartner: string,
    aboutMe?: string,
    aboutRelationship?: string,
  ): Promise<AttractionTraitsResult> {
    const parts: string[] = ['aboutPartner:', aboutPartner.trim() || '(empty)'];
    if (aboutMe != null && aboutMe.trim()) {
      parts.push('', '(optional) aboutMe:', aboutMe.trim());
    }
    if (aboutRelationship != null && aboutRelationship.trim()) {
      parts.push('', '(optional) aboutRelationship:', aboutRelationship.trim());
    }
    const user = parts.join('\n');

    const requestId = randomUUID();
    const { value } = await this.llm.completeJSON<AttractionTraitsResult>({
      modelKey: 'fast',
      system: ATTRACTION_TRAITS_SYSTEM_PROMPT,
      user,
      schema: AttractionTraitsResultSchema,
      temperature: 0.2,
      maxTokens: 600,
      timeoutMs: 15_000,
      requestId,
      purpose: 'evaluate-attraction-traits',
    });

    const clampInt = (n: number, lo: number, hi: number) =>
      Math.round(Math.max(lo, Math.min(hi, n)));
    const a = value.attraction;
    const evidence = Array.isArray(value.evidence)
      ? value.evidence.map((e) => ({
          dimension: typeof e.dimension === 'string' ? e.dimension : String(e.dimension ?? ''),
          quote: typeof e.quote === 'string' ? e.quote.slice(0, 200) : String(e.quote ?? ''),
        }))
      : [];

    return {
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
    const { aboutMe, aboutRelationship, aboutPartner, profileId } = input;

    const { self, relationship, partner, _usage } =
      await this.extractionService.extractAllThree(
        aboutMe.trim(),
        aboutRelationship.trim(),
        aboutPartner.trim(),
        profileId,
      );

    const [display, selfVsPartner, selfVsRelationship] = await Promise.all([
      this.generateSummaryFromSignals(self, partner, relationship),
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

    const useCautious = isLowCoverageOrConfidence(self, partner, relationship);
    const { summary, insight } = applyHonestyFraming(
      display.summary,
      display.insight,
      useCautious,
    );

    const { productScores, flags } = computeProductScores(
      self,
      partner,
      relationship,
      selfVsPartner,
      selfVsRelationship,
    );

    const displayNote =
      flags.includes('LOW_COVERAGE') || flags.includes('LOW_CONFIDENCE')
        ? DISPLAY_NOTE_LOW_QUALITY
        : undefined;

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
        flags,
        _usage,
      },
    };
  }
}
