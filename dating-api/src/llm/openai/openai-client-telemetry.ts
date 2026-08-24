import type { Logger } from '@nestjs/common';

export type LatencyStage = 'extraction_partner' | 'eval_traits';

export interface FetchTiming {
  tOpenaiRequestSent: number;
  tFirstByte: number;
}

export interface StageLatencySnapshot {
  stage: LatencyStage;
  totalMs: number;
  ttfbMs: number;
  generationMs: number;
  promptTokens: number;
  completionTokens: number;
  tokens: number;
  inputSize: number;
}

export interface RecordSuccessLatencyArgs {
  logger: Logger;
  requestId: string;
  purpose: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemLength: number;
  userLength: number;
  inputTextLength: number | undefined;
  latencyStage: LatencyStage | undefined;
  start: number;
  end: number;
  usage: unknown;
  fetchTimingByRequestId: Map<string, FetchTiming>;
  stageSnapshots: Map<LatencyStage, StageLatencySnapshot>;
}

/** Post-success timing logs + stage comparison (move-only from OpenAIClient.completeJSON). */
export function recordSuccessfulLatency(args: RecordSuccessLatencyArgs): void {
  const {
    logger,
    requestId,
    purpose,
    model,
    temperature,
    maxTokens,
    systemLength,
    userLength,
    inputTextLength,
    latencyStage,
    start,
    end,
    usage,
    fetchTimingByRequestId,
    stageSnapshots,
  } = args;

  const latencyMs = end - start;
  const usageObj = (usage as
    | {
        prompt_tokens?: unknown;
        completion_tokens?: unknown;
        total_tokens?: unknown;
      }
    | undefined) ?? {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  };
  const promptTokens =
    typeof usageObj.prompt_tokens === 'number' ? usageObj.prompt_tokens : 0;
  const completionTokens =
    typeof usageObj.completion_tokens === 'number'
      ? usageObj.completion_tokens
      : 0;
  const totalTokens =
    typeof usageObj.total_tokens === 'number'
      ? usageObj.total_tokens
      : promptTokens + completionTokens;
  const fetchTiming = fetchTimingByRequestId.get(requestId);
  const tOpenaiRequestSent = fetchTiming?.tOpenaiRequestSent ?? start;
  const tFirstByte = fetchTiming?.tFirstByte ?? end;
  const ttfbMs = Math.max(0, tFirstByte - tOpenaiRequestSent);
  const generationMs = Math.max(0, end - tFirstByte);
  const stage = latencyStage;
  const isTargetStage =
    stage === 'extraction_partner' || stage === 'eval_traits';

  if (isTargetStage) {
    logger.log(
      JSON.stringify({
        event: 'llm_timing_breakdown',
        stage,
        requestId,
        purpose,
        model,
        t_request_start: new Date(start).toISOString(),
        t_openai_request_sent: new Date(tOpenaiRequestSent).toISOString(),
        t_first_byte: new Date(tFirstByte).toISOString(),
        t_response_end: new Date(end).toISOString(),
        total_duration_ms: latencyMs,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        input_text_length: inputTextLength ?? userLength,
        system_prompt_length: systemLength,
        temperature,
        max_tokens: maxTokens,
      }),
    );
    logger.log(
      JSON.stringify({
        event: 'llm_latency_breakdown',
        stage,
        totalMs: latencyMs,
        ttfbMs,
        generationMs,
        tokens: totalTokens,
        inputSize: inputTextLength ?? userLength,
      }),
    );

    stageSnapshots.set(stage, {
      stage,
      totalMs: latencyMs,
      ttfbMs,
      generationMs,
      promptTokens,
      completionTokens,
      tokens: totalTokens,
      inputSize: inputTextLength ?? userLength,
    });

    const extraction = stageSnapshots.get('extraction_partner');
    const traits = stageSnapshots.get('eval_traits');
    if (extraction && traits) {
      const largerPromptStage =
        extraction.promptTokens >= traits.promptTokens
          ? 'extraction_partner'
          : 'eval_traits';
      const longerGenerationStage =
        extraction.generationMs >= traits.generationMs
          ? 'extraction_partner'
          : 'eval_traits';
      const networkDelta = Math.abs(extraction.ttfbMs - traits.ttfbMs);
      const generationDelta = Math.abs(
        extraction.generationMs - traits.generationMs,
      );
      const promptDelta = Math.abs(
        extraction.promptTokens - traits.promptTokens,
      );
      let bottleneck = 'mixed';
      if (networkDelta > generationDelta && networkDelta > 250) {
        bottleneck = 'network_or_upstream_queue';
      } else if (
        longerGenerationStage === largerPromptStage &&
        promptDelta > 80
      ) {
        bottleneck = 'payload_size_or_model_compute';
      } else if (generationDelta > 250) {
        bottleneck = 'model_generation';
      }

      logger.log(
        JSON.stringify({
          event: 'llm_latency_comparison',
          extraction_partner: extraction,
          eval_traits: traits,
          largerPromptStage,
          longerServerProcessingStage: longerGenerationStage,
          detectedDelaySource: bottleneck,
        }),
      );
      stageSnapshots.clear();
    }
  }

  fetchTimingByRequestId.delete(requestId);
  logger.log(
    `requestId=${requestId} purpose=${purpose} model=${model} provider=openai latencyMs=${latencyMs} ok=true`,
  );
}
