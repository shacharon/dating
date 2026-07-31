import { Injectable } from '@nestjs/common';
import { LLMRouterService } from '../../llm/llm-router.service';
import { buildFallbackMatchNarrative } from './match-narrative-fallback';
import {
  buildMatchNarrativeSystemPrompt,
  buildMatchNarrativeUserPrompt,
} from './match-narrative-prompt';
import { MatchNarrativeLlmSchema } from './match-narrative.schema';
import {
  MATCH_NARRATIVE_PROMPT_VERSION,
  type GenerateMatchNarrativeResult,
  type MatchNarrativeFactPack,
} from './match-narrative.types';
import { validateLlmNarrative } from './match-narrative-validate';

@Injectable()
export class MatchNarrativeGenerator {
  constructor(private readonly llm: LLMRouterService) {}

  async generate(
    factPack: MatchNarrativeFactPack,
    opts: { requestId: string },
  ): Promise<GenerateMatchNarrativeResult> {
    const fallback = (): GenerateMatchNarrativeResult => ({
      narrative: buildFallbackMatchNarrative(factPack),
      source: 'fallback',
      promptVersion: MATCH_NARRATIVE_PROMPT_VERSION,
    });

    try {
      const { value } = await this.llm.completeJSON({
        modelKey: 'fast',
        system: buildMatchNarrativeSystemPrompt(),
        user: buildMatchNarrativeUserPrompt(factPack),
        schema: MatchNarrativeLlmSchema,
        temperature: 0.4,
        maxTokens: 900,
        timeoutMs: 20_000,
        requestId: opts.requestId,
        purpose: 'match_narrative',
      });

      const narrative = value.narrative?.trim() ?? '';
      const check = validateLlmNarrative(narrative, factPack);
      if (!check.ok) {
        return fallback();
      }

      return {
        narrative,
        source: 'llm',
        promptVersion: MATCH_NARRATIVE_PROMPT_VERSION,
      };
    } catch {
      return fallback();
    }
  }
}
