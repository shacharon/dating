import { randomUUID } from 'crypto';
import { ErrorCodes } from '../../../logging/error-codes';
import { getRequestLogFields } from '../../../logging/request-log-context';
import type { StructuredObservabilityService } from '../../../logging/structured-observability.service';
import type { MatchExplanationTrait } from '../../../matches/explainability/core/match-explanation-traits';
import type {
  MatchExplainabilityDto,
  MatchRecommendationDto,
} from '../../../matches/engine/match-engine';
import {
  MATCH_NARRATIVE_PROMPT_VERSION,
  type MatchNarrativeCacheService,
  type MatchNarrativeGenerator,
  buildMatchNarrativeFactPack,
} from '../../../matches/match-narrative';

export type ResolveMatchNarrativeArgs = {
  viewerProfileId: string;
  candidateProfileId: string;
  viewerEvaluationId: string;
  candidateEvaluationId: string;
  finalScore: number;
  explainability: MatchExplainabilityDto;
  recommendation: MatchRecommendationDto;
  traits?: MatchExplanationTrait[];
  viewerAbout?: {
    aboutMe?: string | null;
    aboutPartner?: string | null;
    aboutRelationship?: string | null;
  };
  candidateAbout?: {
    aboutMe?: string | null;
    aboutPartner?: string | null;
    aboutRelationship?: string | null;
  };
};

/**
 * Lazy evaluation-keyed narrative: cache hit → return; miss → LLM (cache only llm source).
 * Fallback narratives are never persisted.
 */
export async function resolveMatchNarrative(
  deps: {
    obs: StructuredObservabilityService;
    matchNarrativeGenerator: MatchNarrativeGenerator;
    matchNarrativeCache: MatchNarrativeCacheService;
  },
  args: ResolveMatchNarrativeArgs,
): Promise<string> {
  const promptVersion = MATCH_NARRATIVE_PROMPT_VERSION;
  const cacheKey = {
    viewerProfileId: args.viewerProfileId,
    candidateProfileId: args.candidateProfileId,
    viewerEvaluationId: args.viewerEvaluationId,
    candidateEvaluationId: args.candidateEvaluationId,
    promptVersion,
  };

  try {
    const cached = await deps.matchNarrativeCache.find(cacheKey);
    if (cached != null && cached.length > 0) {
      deps.obs.trace(
        `me matches narrative cache hit viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
        ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_HIT,
      );
      return cached;
    }
  } catch {
    // treat as miss
  }

  deps.obs.trace(
    `me matches narrative cache miss viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
    ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_MISS,
  );

  const requestId = getRequestLogFields()?.requestId ?? randomUUID();
  const factPack = buildMatchNarrativeFactPack({
    finalScore: args.finalScore,
    explainability: args.explainability,
    recommendation: {
      caution: args.recommendation.caution,
      suggestedNextAction: args.recommendation.suggestedNextAction,
    },
    traits: args.traits,
    viewerAbout: args.viewerAbout,
    candidateAbout: args.candidateAbout,
  });

  const generated = await deps.matchNarrativeGenerator.generate(factPack, {
    requestId,
  });

  if (generated.source === 'llm') {
    deps.obs.trace(
      `me matches narrative llm ok viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion} source=llm`,
      ErrorCodes.ME_MATCHES_NARRATIVE_LLM_OK,
    );
    try {
      await deps.matchNarrativeCache.upsert({
        ...cacheKey,
        narrative: generated.narrative,
      });
      deps.obs.trace(
        `me matches narrative cache store ok viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
        ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_STORE_OK,
      );
    } catch {
      deps.obs.trace(
        `me matches narrative cache store fail viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion}`,
        ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_STORE_FAIL,
      );
    }
  } else {
    deps.obs.trace(
      `me matches narrative fallback viewerProfileId=${args.viewerProfileId} candidateProfileId=${args.candidateProfileId} promptVersion=${promptVersion} source=fallback`,
      ErrorCodes.ME_MATCHES_NARRATIVE_FALLBACK,
    );
  }

  return generated.narrative;
}
