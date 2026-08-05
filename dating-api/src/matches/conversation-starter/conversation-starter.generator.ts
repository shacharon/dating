import { Injectable } from '@nestjs/common';
import { LLMRouterService } from '../../llm/llm-router.service';
import { buildFallbackConversationStarter } from './conversation-starter-fallback';
import {
  buildConversationStarterSystemPrompt,
  buildConversationStarterUserPrompt,
} from './conversation-starter-prompt';
import { ConversationStarterLlmSchema } from './conversation-starter.schema';
import {
  CONVERSATION_STARTER_PROMPT_VERSION,
  type ConversationStarterFactPack,
  type GenerateConversationStarterResult,
} from './conversation-starter.types';
import { validateLlmOpener } from './conversation-starter-validate';

@Injectable()
export class ConversationStarterGenerator {
  constructor(private readonly llm: LLMRouterService) {}

  async generate(args: {
    factPack: ConversationStarterFactPack;
    requestId: string;
  }): Promise<GenerateConversationStarterResult | { opener: null; source: 'none' }> {
    const { factPack, requestId } = args;

    const asFallback = ():
      | GenerateConversationStarterResult
      | { opener: null; source: 'none' } => {
      const opener = buildFallbackConversationStarter(factPack);
      if (!opener) {
        return { opener: null, source: 'none' };
      }
      return {
        opener,
        source: 'fallback',
        promptVersion: CONVERSATION_STARTER_PROMPT_VERSION,
      };
    };

    try {
      const { value } = await this.llm.completeJSON({
        modelKey: 'fast',
        system: buildConversationStarterSystemPrompt(),
        user: buildConversationStarterUserPrompt(factPack),
        schema: ConversationStarterLlmSchema,
        temperature: 0.7,
        maxTokens: 80,
        timeoutMs: 12_000,
        requestId,
        purpose: 'conversation_starter',
      });

      const check = validateLlmOpener(value.opener ?? '', factPack);
      if (!check.ok) {
        return asFallback();
      }

      return {
        opener: check.opener,
        source: 'llm',
        promptVersion: CONVERSATION_STARTER_PROMPT_VERSION,
      };
    } catch {
      return asFallback();
    }
  }
}
