import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { loadLLMConfig } from '../llm/llm.config';
import { ErrorCodes } from '../logging/error-codes';
import { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { ContentModerationPort } from './content-moderation.ports';
import {
  MODERATION_INPUT_MAX_CHARS,
  MODERATION_TIMEOUT_MS,
  pickPrimaryCategory,
  type ModerationResult,
} from './content-moderation.types';

const emptyClean = (failOpen: boolean): ModerationResult => ({
  flagged: false,
  categories: [],
  primaryCategory: null,
  score: 0,
  sexualScore: null,
  failOpen,
});

@Injectable()
export class OpenAIModerationClient implements ContentModerationPort {
  private readonly apiKey: string;

  constructor(private readonly obs: StructuredObservabilityService) {
    this.apiKey = loadLLMConfig().openai.apiKey?.trim() ?? '';
  }

  async checkContent(text: string): Promise<ModerationResult> {
    const trimmed = text.trim();
    if (!trimmed) {
      return emptyClean(false);
    }

    if (!this.apiKey) {
      this.obs.trace(
        `content moderation fail-open reason=missing_api_key textLength=${trimmed.length}`,
        ErrorCodes.CONTENT_MODERATION_FAIL_OPEN,
      );
      return emptyClean(true);
    }

    const input =
      trimmed.length > MODERATION_INPUT_MAX_CHARS
        ? trimmed.slice(0, MODERATION_INPUT_MAX_CHARS)
        : trimmed;

    try {
      const client = this.createSdkClient();
      const response = await client.moderations.create(
        { input },
        { timeout: MODERATION_TIMEOUT_MS },
      );
      const result = response.results?.[0];
      if (!result) {
        this.obs.trace(
          `content moderation fail-open reason=empty_results textLength=${input.length}`,
          ErrorCodes.CONTENT_MODERATION_FAIL_OPEN,
        );
        return emptyClean(true);
      }

      const categoryMap =
        (result.categories as unknown as Record<string, boolean>) ?? {};
      const scoreMap =
        (result.category_scores as unknown as Record<string, number>) ?? {};
      const categories = Object.entries(categoryMap)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      const { primaryCategory, score } = pickPrimaryCategory(
        scoreMap,
        categories,
      );
      const rawSexual = scoreMap.sexual;
      const sexualScore =
        typeof rawSexual === 'number' && Number.isFinite(rawSexual)
          ? rawSexual
          : null;

      return {
        flagged: result.flagged === true,
        categories,
        primaryCategory,
        score,
        sexualScore,
        failOpen: false,
      };
    } catch (err: unknown) {
      const reason =
        err && typeof err === 'object' && 'name' in err
          ? String((err as { name?: string }).name)
          : 'error';
      this.obs.trace(
        `content moderation fail-open reason=${reason} textLength=${input.length}`,
        ErrorCodes.CONTENT_MODERATION_FAIL_OPEN,
      );
      return emptyClean(true);
    }
  }

  /** Overridable in unit tests. */
  protected createSdkClient(): OpenAI {
    return new OpenAI({ apiKey: this.apiKey });
  }
}
