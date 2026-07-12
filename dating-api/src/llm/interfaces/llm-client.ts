import type { ZodSchema } from 'zod';

export interface CompleteJSONArgs<T> {
  system: string;
  user: string;
  schema: ZodSchema<T>;
  model: string;
  temperature?: number;
  timeoutMs?: number;
  maxTokens?: number;
  requestId: string;
  purpose: string;
  /** Optional latency stage tag for focused diagnostics. */
  latencyStage?: 'extraction_partner' | 'eval_traits';
  /** Optional raw-input length for diagnostics (different from prompt wrapper length). */
  inputTextLength?: number;
  /** If set, on truncation/empty output the client retries once with this system prompt and maxTokens. */
  secondAttemptOnTruncation?: { system: string; maxTokens: number };
}

export interface CompleteJSONResult<T> {
  value: T;
  rawText: string;
  usage?: unknown;
}

/**
 * Abstraction for an LLM client. Business code must depend only on this interface.
 */
export interface LLMClient {
  completeJSON<T>(args: CompleteJSONArgs<T>): Promise<CompleteJSONResult<T>>;
}
