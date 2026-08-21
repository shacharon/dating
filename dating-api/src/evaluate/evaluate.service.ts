import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
import type { EvaluateLlmCallTrace } from './evaluate-llm-pipeline';
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
} from './evaluate-display-helpers';
import { runEvaluateAttractionProfile } from './evaluate-attraction.runner';
import { runEvaluateAttractionTraits } from './evaluate-attraction-traits.runner';
import { runEvaluateDerivedContext } from './evaluate-derived-context.runner';
import { runEvaluateMotivation } from './evaluate-motivation.runner';
import { runEvaluateSummary } from './evaluate-summary.runner';
import type {
  AttractionResult,
  AttractionTraitsResult,
  RelationshipMotivationResult,
} from './evaluate-inference-schemas';
import type {
  DerivedContextV1,
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
  DerivedContextV1,
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
    return runEvaluateSummary(
      this.llm,
      this.logger,
      self,
      partner,
      relationship,
    );
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
    return runEvaluateMotivation(
      this.llm,
      this.logger,
      aboutMe,
      aboutPartner,
      aboutRelationship,
      opts,
    );
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
    return runEvaluateAttractionProfile(
      this.llm,
      this.logger,
      aboutMe,
      aboutPartner,
      opts,
    );
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
    return runEvaluateAttractionTraits(
      this.llm,
      this.logger,
      aboutPartner,
      aboutMe,
      aboutRelationship,
      opts,
    );
  }

  /**
   * Infer occupation class, visibility need, and life stage from profile texts.
   * Used for dealbreaker context at match time (persisted on evaluationJson).
   */
  async inferDerivedContext(
    aboutMe: string,
    aboutPartner: string,
    aboutRelationship: string,
    opts?: { collectTrace?: boolean },
  ): Promise<DerivedContextV1 & { _evaluateLlmTrace?: EvaluateLlmCallTrace }> {
    return runEvaluateDerivedContext(
      this.llm,
      this.logger,
      aboutMe,
      aboutPartner,
      aboutRelationship,
      opts,
    );
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

    // Start all evaluation LLM calls together (summary + optional extended signals + derived context).
    const displayPromise = this.generateSummaryFromSignals(
      self,
      partner,
      relationship,
    );
    const derivedContextPromise = (async (): Promise<
      | (DerivedContextV1 & { dcTrace?: EvaluateLlmCallTrace })
      | undefined
    > => {
      try {
        const pack = await this.inferDerivedContext(
          aboutMe.trim(),
          aboutPartner.trim(),
          aboutRelationship.trim(),
          { collectTrace: true },
        );
        const { _evaluateLlmTrace: dcTrace, ...derivedContext } = pack;
        return { ...derivedContext, dcTrace };
      } catch (err) {
        this.logger.warn(
          `Derived context inference failed: ${err instanceof Error ? err.message : String(err)}`,
          'EvaluateService',
        );
        return undefined;
      }
    })();

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

    // Await optional extended signals and derived context (parallel with summary).
    const [inferredExtendedSignals, inferredDerivedContext] = await Promise.all(
      [extendedSignalsPromise, derivedContextPromise],
    );
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
        ...(inferredDerivedContext && {
          derivedContext: (() => {
            const { dcTrace: _dc, ...dc } = inferredDerivedContext;
            return dc;
          })(),
        }),
        _evaluateLlmTraces: {
          evalRequestId,
          summary: summaryLlmTrace,
          ...(inferredExtendedSignals?.motTrace && {
            relationshipMotivation: inferredExtendedSignals.motTrace,
          }),
          ...(inferredExtendedSignals?.attTrace && {
            attractionTraits: inferredExtendedSignals.attTrace,
          }),
          ...(inferredDerivedContext?.dcTrace && {
            derivedContext: inferredDerivedContext.dcTrace,
          }),
        },
      },
    };
  }
}
