import { randomUUID } from 'node:crypto';
import type { ExtractionService } from '../extraction/extraction.service';
import type { LLMRouterService } from '../llm/llm-router.service';
import type { SimpleLogger } from '../logger/simple-logger.service';
import { computeCompatibility } from '../compatibility/compatibility-score';
import { buildChips } from './chips-builder';
import { buildEnrichmentSignalsV2 } from './enrichment-v2';
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
} from './evaluate-display-helpers';
import { runEvaluateAttractionTraits } from './evaluate-attraction-traits.runner';
import { runEvaluateDerivedContext } from './evaluate-derived-context.runner';
import { runEvaluateMotivation } from './evaluate-motivation.runner';
import { runEvaluateSummary } from './evaluate-summary.runner';
import type {
  DerivedContextV1,
  ExtendedSignals,
  EvaluateBatchInput,
  EvaluateBatchResult,
} from './evaluate-batch.types';

export type EvaluateBatchDeps = {
  extractionService: ExtractionService;
  llm: LLMRouterService;
  logger: SimpleLogger;
};

export async function runEvaluateBatch(
  deps: EvaluateBatchDeps,
  input: EvaluateBatchInput,
): Promise<{ ok: true; result: EvaluateBatchResult }> {
  const { extractionService, llm, logger } = deps;
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
    await extractionService.extractAllThree(
      aboutMe.trim(),
      aboutRelationship.trim(),
      aboutPartner.trim(),
      profileId,
    );

  // Start all evaluation LLM calls together (summary + optional extended signals + derived context).
  const displayPromise = runEvaluateSummary(
    llm,
    logger,
    self,
    partner,
    relationship,
  );
  const derivedContextPromise = (async (): Promise<
    | (DerivedContextV1 & { dcTrace?: EvaluateLlmCallTrace })
    | undefined
  > => {
    try {
      const pack = await runEvaluateDerivedContext(
        llm,
        logger,
        aboutMe.trim(),
        aboutPartner.trim(),
        aboutRelationship.trim(),
        { collectTrace: true },
      );
      const { _evaluateLlmTrace: dcTrace, ...derivedContext } = pack;
      return { ...derivedContext, dcTrace };
    } catch (err) {
      logger.warn(
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
        runEvaluateMotivation(
          llm,
          logger,
          aboutMe.trim(),
          aboutPartner.trim(),
          aboutRelationship.trim(),
          { collectTrace: true },
        ),
        runEvaluateAttractionTraits(
          llm,
          logger,
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
      logger.warn(
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
  const [inferredExtendedSignals, inferredDerivedContext] = await Promise.all([
    extendedSignalsPromise,
    derivedContextPromise,
  ]);
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
  logger.log(
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

  const enrichmentMapped = buildEnrichmentSignalsV2(
    aboutMe.trim(),
    aboutPartner.trim(),
    aboutRelationship.trim(),
  );
  const enrichmentSignals = sanitizeEnrichmentSignalsV1ForPersist(
    enrichmentMapped,
    {
      profileId: profileId ?? null,
      onDropped: (e) =>
        logger.warn(
          JSON.stringify({ event: 'enrichment_field_dropped', ...e }),
          'EvaluateService',
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
