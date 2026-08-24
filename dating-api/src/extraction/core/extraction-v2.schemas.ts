import { z } from 'zod';
import {
  MAX_EVIDENCE_ITEMS,
  type ExtractionDomain,
  type LLMUsageStats,
} from '../extracted-signals.interface';

export function emptyUsage(): LLMUsageStats {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUSD: 0,
    durationMs: 0,
  };
}

export function mergeUsage(a: LLMUsageStats, b: LLMUsageStats): LLMUsageStats {
  return {
    promptTokens: a.promptTokens + b.promptTokens,
    completionTokens: a.completionTokens + b.completionTokens,
    totalTokens: a.totalTokens + b.totalTokens,
    estimatedCostUSD: a.estimatedCostUSD + b.estimatedCostUSD,
    durationMs: a.durationMs + b.durationMs,
  };
}

const GPT4O_MINI_INPUT_COST = 0.15 / 1_000_000;
const GPT4O_MINI_OUTPUT_COST = 0.6 / 1_000_000;

export function estimateCost(promptTokens: number, completionTokens: number): number {
  return (
    promptTokens * GPT4O_MINI_INPUT_COST +
    completionTokens * GPT4O_MINI_OUTPUT_COST
  );
}

export function parseOpenAIUsage(usage: unknown): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} {
  const u =
    usage && typeof usage === 'object'
      ? (usage as Record<string, unknown>)
      : {};
  const promptTokens =
    typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0;
  const completionTokens =
    typeof u.completion_tokens === 'number' ? u.completion_tokens : 0;
  const totalTokens =
    typeof u.total_tokens === 'number'
      ? u.total_tokens
      : promptTokens + completionTokens;
  return { promptTokens, completionTokens, totalTokens };
}

export const RAW_INTERESTS_SCHEMA = z
  .object({
    rawInterests: z.array(z.string()).max(10),
  })
  .strict();

export const RAW_NEGATIVE_PREFERENCES_SCHEMA = z
  .object({
    negativePreferences: z.array(z.string()).max(10),
    softNo: z.array(z.string()).max(10),
    dealbreakers: z.array(z.string()).max(10),
  })
  .strict();

const BaseSignalsEvidenceItemSchema = z
  .object({
    signal: z.string(),
    quote: z.string(),
    reason: z.string().optional(),
    note: z.string().optional(),
  })
  .strict();

export const BaseSignalsOutputSchemaByDomain: Record<
  ExtractionDomain,
  z.ZodType<Record<string, unknown>>
> = {
  self: z
    .object({
      domain: z.literal('self'),
      signals: z.record(z.string(), z.union([z.number(), z.null()])),
      rawInterests: z.array(z.string()).max(10),
      evidence: z.array(BaseSignalsEvidenceItemSchema).max(MAX_EVIDENCE_ITEMS),
      confidence: z.number(),
      version: z.string().optional(),
      notes: z.string().optional(),
    })
    .strict(),
  partner: z
    .object({
      domain: z.literal('partner'),
      signals: z.record(z.string(), z.union([z.number(), z.null()])),
      rawInterests: z.array(z.string()).max(10),
      evidence: z.array(BaseSignalsEvidenceItemSchema).max(MAX_EVIDENCE_ITEMS),
      confidence: z.number(),
      version: z.string().optional(),
      notes: z.string().optional(),
    })
    .strict(),
  relationship: z
    .object({
      domain: z.literal('relationship'),
      signals: z.record(z.string(), z.union([z.number(), z.null()])),
      rawInterests: z.array(z.string()).max(10),
      evidence: z.array(BaseSignalsEvidenceItemSchema).max(MAX_EVIDENCE_ITEMS),
      confidence: z.number(),
      version: z.string().optional(),
      notes: z.string().optional(),
    })
    .strict(),
};
