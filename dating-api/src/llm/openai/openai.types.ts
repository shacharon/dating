/**
 * Minimal types for OpenAI responses (avoid importing full SDK types where not needed).
 */
export interface OpenAICompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface OpenAIChoice {
  message?: { content?: string | null };
  finish_reason?: string;
}

export interface OpenAICompletionResponse {
  choices?: OpenAIChoice[];
  usage?: OpenAICompletionUsage;
}
