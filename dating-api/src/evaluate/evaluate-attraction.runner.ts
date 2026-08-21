import { randomUUID } from 'node:crypto';
import type { LLMRouterService } from '../llm/llm-router.service';
import {
  buildEvaluateLlmTrace,
  buildEvaluateRawLlmLogPayload,
  type EvaluateLlmCallTrace,
} from './evaluate-llm-pipeline';
import { ATTRACTION_SYSTEM_PROMPT } from './evaluate-llm-prompts';
import {
  AttractionResultSchema,
  type AttractionResult,
} from './evaluate-inference-schemas';
import type { EvaluateLog } from './evaluate-summary.runner';

/**
 * Infer what attracts this person from aboutMe and aboutPartner (partner description).
 * Returns attractionProfile (ambition, appearance, kindness, status, stability 0–10), confidence, evidence.
 */
export async function runEvaluateAttractionProfile(
  llm: LLMRouterService,
  logger: EvaluateLog,
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
  const { value, rawText } = await llm.completeJSON<AttractionResult>({
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

  logger.log(
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
  logger.log(
    JSON.stringify({ event: 'evaluate_llm_pipeline_stage_diffs', ...trace }),
    'EvaluateService',
  );
  if (opts?.collectTrace) {
    return { ...out, _evaluateLlmTrace: trace };
  }
  return out;
}
