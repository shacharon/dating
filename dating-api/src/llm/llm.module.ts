import { Module } from '@nestjs/common';
import { loadLLMConfig } from './llm.config';
import {
  LLM_CONFIG,
  OPENAI_LLM_CLIENT,
  LLM_CLIENTS_MAP,
} from './llm.constants';
import type { LLMConfig } from './llm.config';
import { LLMRouterService } from './llm-router.service';
import { OpenAIClient } from './openai/openai.client';
import type { LLMClient } from './interfaces/llm-client';

@Module({
  providers: [
    {
      provide: LLM_CONFIG,
      useFactory: (): LLMConfig => {
        const config = loadLLMConfig();
        if (!config.openai.apiKey) {
          throw new Error(
            'Missing OPENAI_API_KEY. Set it in dating-api/.env before starting the API.',
          );
        }
        return config;
      },
    },
    {
      provide: OPENAI_LLM_CLIENT,
      useFactory: (config: LLMConfig) => new OpenAIClient(config),
      inject: [LLM_CONFIG],
    },
    {
      provide: LLM_CLIENTS_MAP,
      useFactory: (openaiClient: LLMClient): Map<string, LLMClient> => {
        const map = new Map<string, LLMClient>();
        map.set('openai', openaiClient);
        return map;
      },
      inject: [OPENAI_LLM_CLIENT],
    },
    LLMRouterService,
  ],
  exports: [LLMRouterService],
})
export class LlmModule {}
