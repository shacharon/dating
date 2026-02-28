import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { ZodError } from 'zod';

import type { CompleteJSONArgs } from '../interfaces/llm-client';
import type { CompleteJSONResult } from '../interfaces/llm-client';
import type { LLMClient } from '../interfaces/llm-client';
import type { LLMConfig } from '../llm.config';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_TOKENS = 4096;
const RETRY_TEMPERATURE_REDUCTION = 0.2;

@Injectable()
export class OpenAIClient implements LLMClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private readonly client: OpenAI;

  constructor(private readonly config: LLMConfig) {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
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
    } = args;

    const run = async (temp: number): Promise<CompleteJSONResult<T>> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const completion = await this.client.chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: temp,
            max_tokens: maxTokens,
            response_format: { type: 'json_object' },
          },
          { signal: controller.signal },
        );
        clearTimeout(timeout);

        const rawText = completion.choices?.[0]?.message?.content?.trim() ?? '';
        const value = schema.parse(JSON.parse(rawText || '{}'));
        const usage = completion.usage;

        return { value, rawText, usage };
      } finally {
        clearTimeout(timeout);
      }
    };

    const start = Date.now();
    try {
      let result: CompleteJSONResult<T>;
      try {
        result = await run(temperature);
      } catch (err) {
        const isSchemaError =
          err instanceof ZodError || err instanceof SyntaxError;
        if (isSchemaError && temperature > 0) {
          const lowerTemp = Math.max(
            0,
            temperature - RETRY_TEMPERATURE_REDUCTION,
          );
          result = await run(lowerTemp);
        } else {
          throw err;
        }
      }
      const latencyMs = Date.now() - start;
      this.logger.log(
        `requestId=${requestId} purpose=${purpose} model=${model} provider=openai latencyMs=${latencyMs} ok=true`,
      );
      return result;
    } catch (err) {
      const latencyMs = Date.now() - start;
      this.logger.log(
        `requestId=${requestId} purpose=${purpose} model=${model} provider=openai latencyMs=${latencyMs} ok=false`,
      );
      throw err;
    }
  }
}
