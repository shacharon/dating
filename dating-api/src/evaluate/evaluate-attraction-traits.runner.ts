import { randomUUID } from 'node:crypto';
import type { LLMRouterService } from '../llm/llm-router.service';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
  type EvaluateLlmCallTrace,
} from './evaluate-llm-pipeline';
import { ATTRACTION_TRAITS_SYSTEM_PROMPT } from './evaluate-llm-prompts';
import {
  AttractionTraitsResultSchema,
  type AttractionTraitsResult,
} from './evaluate-inference-schemas';
import type { EvaluateLog } from './evaluate-summary.runner';

/**
 * Infer attraction traits (9 dimensions) from aboutPartner; optionally use aboutMe/aboutRelationship if aboutPartner is thin.
 * Returns attraction (integers 0–10), confidence, evidence with dimension+quote.
 */
export async function runEvaluateAttractionTraits(
  llm: LLMRouterService,
  logger: EvaluateLog,
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
  const { value, rawText } = await llm.completeJSON<AttractionTraitsResult>({
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

  logger.log(
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
  logger.log(
    JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
    'EvaluateService',
  );
  if (opts?.collectTrace) {
    return { ...out, _evaluateLlmTrace: trace };
  }
  return out;
}
