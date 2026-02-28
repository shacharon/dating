import { Injectable, Inject } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import type { LLMClient, CompleteJSONResult } from './interfaces/llm-client';
import type { LLMConfig } from './llm.config';
import { LLM_CLIENTS_MAP, LLM_CONFIG } from './llm.constants';

export interface RouterCompleteJSONArgs<T> {
  modelKey: string;
  system: string;
  user: string;
  schema: ZodSchema<T>;
  model?: string;
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  requestId: string;
  purpose: string;
}

@Injectable()
export class LLMRouterService {
  constructor(
    @Inject(LLM_CLIENTS_MAP)
    private readonly clientsMap: Map<string, LLMClient>,
    @Inject(LLM_CONFIG) private readonly config: LLMConfig,
  ) {}

  async completeJSON<T>(
    args: RouterCompleteJSONArgs<T>,
  ): Promise<CompleteJSONResult<T>> {
    const { modelKey, model: modelOverride, ...rest } = args;
    const entry = this.config.models.get(modelKey);
    if (!entry) {
      throw new Error(`Unknown LLM modelKey: ${modelKey}`);
    }
    const client = this.clientsMap.get(entry.provider);
    if (!client) {
      throw new Error(
        `No LLM client registered for provider: ${entry.provider}`,
      );
    }
    const model = modelOverride ?? entry.modelName;
    return client.completeJSON<T>({ ...rest, model });
  }
}
