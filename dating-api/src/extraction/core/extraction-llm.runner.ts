import { z } from 'zod';
import type { LLMRouterService } from '../../llm/llm-router.service';
import type { ExtractionDomain } from '../extracted-signals.interface';
import { getSystemPromptForDomain } from '../prompt/extraction-prompt.builder';

export type ExtractionLlmCallResult = {
  value: Record<string, unknown>;
  rawText: string | null;
  usage: unknown;
};

export async function runFirstLlmExtractionCall(
  llm: LLMRouterService,
  domain: ExtractionDomain,
  userPrompt: string,
  requestId: string,
  inputTextLength: number,
): Promise<ExtractionLlmCallResult> {
  const systemPrompt = getSystemPromptForDomain(domain);
  const { value, rawText, usage } = await llm.completeJSON<
    Record<string, unknown>
  >({
    modelKey: 'fast',
    system: systemPrompt,
    user: userPrompt,
    schema: z.any(),
    temperature: 0.1,
    maxTokens: 5000,
    timeoutMs: 120_000,
    requestId,
    purpose: 'extraction',
    ...(domain === 'partner' && {
      latencyStage: 'extraction_partner' as const,
      inputTextLength,
    }),
  });
  return { value, rawText, usage };
}

/** Log EMPTY_MODEL_TEXT when raw model text is empty — same payload as pre-split service. */
export function logEmptyModelTextIfNeeded(
  logger: { log: (msg: string, context?: string) => void },
  requestId: string,
  rawText: string | null,
  contextName = 'ExtractionService',
): void {
  if ((rawText ?? '').trim().length === 0) {
    logger.log(
      JSON.stringify({
        event: 'EMPTY_MODEL_TEXT',
        requestId,
        purpose: 'extraction',
      }),
      contextName,
    );
  }
}
