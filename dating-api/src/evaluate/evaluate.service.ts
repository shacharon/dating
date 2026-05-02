import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { ExtractionService } from '../extraction/extraction.service';
import type { ExtractedSignals } from '../extraction/extracted-signals.interface';
import { LLMRouterService } from '../llm/llm-router.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import { computeCompatibility } from '../compatibility/compatibility-score';
import {
  detectLifestyleConflicts,
  type LifestyleConflictsResult,
} from '../compatibility/lifestyle-conflicts';
import { buildChips } from './chips-builder';
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
import { buildExplicitExtendedLists } from './explicit-extended-lists';
import {
  buildProductScoresPresentation,
  computeProductScores,
} from './product-scores';
import {
  applyHonestyFraming,
  DISPLAY_NOTE_LOW_QUALITY,
  isLowCoverageOrConfidence,
  type NormalizedDisplay,
  normalizeDisplay,
} from './evaluate-display-helpers';
import {
  ATTRACTION_SYSTEM_PROMPT,
  ATTRACTION_TRAITS_SYSTEM_PROMPT,
  MOTIVATION_SYSTEM_PROMPT,
  SUMMARY_SYSTEM_PROMPT,
} from './evaluate-llm-prompts';
import {
  AnalysisPresentationSchema,
  AttractionResultSchema,
  AttractionTraitsResultSchema,
  RelationshipMotivationResultSchema,
  type AttractionResult,
  type AttractionTraitsResult,
  type RelationshipMotivationResult,
} from './evaluate-inference-schemas';
import type {
  ExtendedSignals,
  EvaluateBatchInput,
  EvaluateBatchResult,
} from './evaluate-batch.types';

export type { ProductScores } from '../domain/scoring/product-scores.types';

export type {
  EvaluateFlag,
  ProductScorePresentationValue,
  ProductScoresPresentation,
} from './product-scores';

export {
  ATTRACTION_TRAITS_KEYS,
  AttractionProfileSchema,
  AttractionResultSchema,
  AttractionTraitsEvidenceItemSchema,
  AttractionTraitsResultSchema,
  AttractionTraitsSchema,
  RELATIONSHIP_MOTIVATION_VALUES,
  RelationshipMotivationResultSchema,
} from './evaluate-inference-schemas';
export type {
  AttractionProfile,
  AttractionResult,
  AttractionTraits,
  AttractionTraitsResult,
  RelationshipMotivation,
  RelationshipMotivationResult,
} from './evaluate-inference-schemas';

export type { Chip, ChipsBundle } from './chips-builder';

export type {
  ExtendedSignals,
  EvaluateBatchInput,
  EvaluateBatchResult,
} from './evaluate-batch.types';

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
    display: NormalizedDisplay;
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
    const { value, rawText } = await this.llm.completeJSON<
      z.infer<typeof AnalysisPresentationSchema>
    >({
      modelKey: 'fast',
      system: SUMMARY_SYSTEM_PROMPT,
      user: `Extracted data:\n${payload}`,
      schema: AnalysisPresentationSchema,
      temperature: 0.3,
      maxTokens: 3000,
      timeoutMs: 20_000,
      requestId,
      purpose: 'evaluate-summary',
    });

    this.logger.log(
      JSON.stringify(
        buildEvaluateRawLlmLogPayload(
          { purpose: 'evaluate-summary', requestId },
          value,
          rawText,
        ),
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

    return { display: normalized, _evaluateLlmTrace: trace };
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
        buildEvaluateRawLlmLogPayload(
          { purpose: 'evaluate-motivation', requestId },
          value,
          rawText,
        ),
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
        buildEvaluateRawLlmLogPayload(
          { purpose: 'evaluate-attraction', requestId },
          value,
          rawText,
        ),
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
    const { value, rawText } =
      await this.llm.completeJSON<AttractionTraitsResult>({
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
          dimension:
            typeof e.dimension === 'string'
              ? e.dimension
              : String(e.dimension ?? ''),
          quote:
            typeof e.quote === 'string'
              ? e.quote.slice(0, 200)
              : String(e.quote ?? ''),
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
    const {
      aboutMe,
      aboutRelationship,
      aboutPartner,
      profileId,
      rawInterests,
    } = input;
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
    const displayPromise = this.generateSummaryFromSignals(
      self,
      partner,
      relationship,
    );
    const extendedSignalsPromise = (async (): Promise<
      | (Pick<
          ExtendedSignals,
          'relationshipMotivation' | 'attractionTraits'
          > & {
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
        const { _evaluateLlmTrace: motTrace, ...motivation } = motivationPack;
        const { _evaluateLlmTrace: attTrace, ...attraction } = attractionPack;

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

    const { display: displayPre, _evaluateLlmTrace: summaryLlmTrace } =
      displayPack;

    const useCautious = isLowCoverageOrConfidence(self, partner, relationship);
    const display = applyHonestyFraming(displayPre, useCautious);

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
    const enrichmentSignals = sanitizeEnrichmentSignalsV1ForPersist(
      enrichmentMapped,
      {
        profileId: profileId ?? null,
        onDropped: (e) =>
          this.logger.warn(
            JSON.stringify({ event: 'enrichment_field_dropped', ...e }),
            EvaluateService.name,
          ),
      },
    );
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
          overallNarrative: display.overallNarrative,
          aboutMeInsight: display.aboutMeInsight,
          relationshipInsight: display.relationshipInsight,
          partnerInsight: display.partnerInsight,
          missingPrompts: display.missingPrompts,
          summary: display.summary,
          insight: display.insight,
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
