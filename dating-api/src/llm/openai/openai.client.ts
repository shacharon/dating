import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ZodError } from 'zod';

import type { CompleteJSONArgs } from '../interfaces/llm-client';
import type { CompleteJSONResult } from '../interfaces/llm-client';
import type { LLMClient } from '../interfaces/llm-client';
import type { LLMConfig } from '../llm.config';
import { debugLogResponse, logOpenAIRawShape } from './openai-client-debug';
import {
  type FetchTiming,
  type LatencyStage,
  type StageLatencySnapshot,
  recordSuccessfulLatency,
} from './openai-client-telemetry';
import {
  extractTextFromOpenAIResponse,
  parseModelJsonText,
} from './openai-response-text';

export { extractTextFromOpenAIResponse } from './openai-response-text';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4096;

@Injectable()
export class OpenAIClient implements LLMClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly client: OpenAI;
  private readonly fetchTimingByRequestId = new Map<string, FetchTiming>();
  private readonly stageSnapshots = new Map<
    LatencyStage,
    StageLatencySnapshot
  >();

  constructor(private readonly config: LLMConfig) {
    const baseFetch: typeof fetch = (input, init) => fetch(input, init);
    const instrumentedFetch = async (input: unknown, init?: unknown) => {
      const requestHeaders = new Headers(
        (init && typeof init === 'object' && 'headers' in init
          ? (init as { headers?: HeadersInit }).headers
          : undefined) ?? {},
      );
      const requestId =
        requestHeaders.get('x-request-id') ??
        requestHeaders.get('x-codex-request-id');
      const sentAt = Date.now();
      const response = await baseFetch(
        input as Parameters<typeof fetch>[0],
        init as Parameters<typeof fetch>[1],
      );
      const firstByteAt = Date.now();
      if (requestId) {
        this.fetchTimingByRequestId.set(requestId, {
          tOpenaiRequestSent: sentAt,
          tFirstByte: firstByteAt,
        });
      }
      return response;
    };
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
      fetch: instrumentedFetch as typeof fetch,
    });
  }

  async completeJSON<T>(
    args: CompleteJSONArgs<T>,
  ): Promise<CompleteJSONResult<T>> {
    const {
      system,
      user,
      schema,
      model,
      temperature = 0.2,
      timeoutMs = DEFAULT_TIMEOUT_MS,
      maxTokens = DEFAULT_MAX_TOKENS,
      requestId,
      purpose,
      latencyStage,
      inputTextLength,
    } = args;

    const run = async (): Promise<CompleteJSONResult<T>> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        // No response_format: with GPT-5 series it can leave message.content empty.
        // Prompt already asks for JSON; model returns it in message.content without it.
        const completion = await this.client.chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            max_completion_tokens: maxTokens,
            // temperature omitted: this model only supports default (1).
          },
          {
            signal: controller.signal,
            headers: {
              'x-request-id': requestId,
              'x-codex-request-id': requestId,
            },
          },
        );

        clearTimeout(timeout);

        logOpenAIRawShape(
          completion,
          requestId,
          purpose,
          model,
          this.logger,
        );
        debugLogResponse(completion, requestId, purpose, this.logger);
        const rawText = extractTextFromOpenAIResponse(completion);
        const value = schema.parse(parseModelJsonText(rawText));
        const usage = (completion as { usage?: unknown }).usage;

        return { value, rawText, usage };
      } finally {
        clearTimeout(timeout);
      }
    };

    const start = Date.now();
    try {
      let result: CompleteJSONResult<T>;
      try {
        result = await run();
      } catch (err) {
        const isSchemaError =
          err instanceof ZodError || err instanceof SyntaxError;
        if (isSchemaError && temperature > 0) {
          result = await run();
        } else {
          throw err;
        }
      }
      const end = Date.now();
      recordSuccessfulLatency({
        logger: this.logger,
        requestId,
        purpose,
        model,
        temperature,
        maxTokens,
        systemLength: system.length,
        userLength: user.length,
        inputTextLength,
        latencyStage,
        start,
        end,
        usage: result.usage,
        fetchTimingByRequestId: this.fetchTimingByRequestId,
        stageSnapshots: this.stageSnapshots,
      });
      return result;
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.logger.log(
        `requestId=${requestId} purpose=${purpose} model=${model} provider=openai latencyMs=${latencyMs} ok=false`,
      );
      this.fetchTimingByRequestId.delete(requestId);
      throw err;
    }
  }
}
