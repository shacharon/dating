import { z } from 'zod';

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
export type AttractionTraitsResult = z.infer<
  typeof AttractionTraitsResultSchema
>;

/**
 * User-facing presentation copy for profile analysis.
 * Legacy compatibility is handled downstream by mapping these fields back into
 * display.summary / display.insight.
 */
export const AnalysisPresentationSchema = z.object({
  overallNarrative: z.string().min(1).optional(),
  aboutMeInsight: z.string().min(1).optional(),
  relationshipInsight: z.string().min(1).optional(),
  partnerInsight: z.string().min(1).optional(),
  missingPrompts: z.array(z.string().min(1)).min(2).max(4).optional(),
  /** Legacy compatibility: existing callers/tests may still provide these keys. */
  summary: z.string().min(1).optional(),
  insight: z.string().min(1).optional(),
})
  .passthrough()
  .refine(
    (v) =>
      Boolean(v.overallNarrative || v.summary) &&
      Boolean(v.relationshipInsight || v.insight),
    {
      message:
        'analysis presentation requires overallNarrative/summary and relationshipInsight/insight',
    },
  );
export type AnalysisPresentation = z.infer<typeof AnalysisPresentationSchema>;

/** Occupation/lifestyle class for dealbreaker context (LLM + persist). */
export const OCCUPATION_CLASS_VALUES = [
  'STANDARD',
  'SHIFT_UNPREDICTABLE',
  'TRAVEL_HEAVY',
] as const;
export type OccupationClass = (typeof OCCUPATION_CLASS_VALUES)[number];

/** Raw LLM output for derived dealbreaker context (profile-level). */
export const LlmDerivedContextRawSchema = z
  .object({
    occupationClass: z
      .enum(OCCUPATION_CLASS_VALUES)
      .nullable()
      .optional(),
    visibilityNeed: z.number().optional(),
    lifeStage: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
    evidence: z.array(z.string()).max(5).optional(),
  })
  .strict();
export type LlmDerivedContextRaw = z.infer<typeof LlmDerivedContextRawSchema>;
