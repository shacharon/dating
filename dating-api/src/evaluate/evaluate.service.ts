import { Injectable } from '@nestjs/common';
import { ExtractionService } from '../extraction/extraction.service';
import { LLMRouterService } from '../llm/llm-router.service';
import { SimpleLogger } from '../logger/simple-logger.service';
import {
  detectLifestyleConflicts,
  type LifestyleConflictsResult,
} from '../compatibility/lifestyle-conflicts';
import type { EvaluateLlmCallTrace } from './evaluate-llm-pipeline';
import { runEvaluateAttractionProfile } from './evaluate-attraction.runner';
import { runEvaluateAttractionTraits } from './evaluate-attraction-traits.runner';
import { runEvaluateDerivedContext } from './evaluate-derived-context.runner';
import { runEvaluateMotivation } from './evaluate-motivation.runner';
import { runEvaluateBatch } from './evaluate-batch.orchestrator';
import type {
  AttractionResult,
  AttractionTraitsResult,
  RelationshipMotivationResult,
} from './evaluate-inference-schemas';
import type {
  DerivedContextV1,
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
    return runEvaluateBatch(
      {
        extractionService: this.extractionService,
        llm: this.llm,
        logger: this.logger,
      },
      input,
    );
  }
}
