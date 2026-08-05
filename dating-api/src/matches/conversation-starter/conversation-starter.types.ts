/** Sprint 42 Story 1 — conversation opener fact pack (no about* free text). */

export const CONVERSATION_STARTER_PROMPT_VERSION = 'v1' as const;

export type ConversationStarterScoreBand =
  | 'strong'
  | 'solid'
  | 'moderate'
  | 'partial'
  | 'weak';

export interface ConversationStarterFactPack {
  finalScore: number;
  scoreBand: ConversationStarterScoreBand;
  positiveChips: string[];
  tensionChip?: string;
  sharedInterests: string[];
  sharedInterestNote?: string;
  viewerNickname?: string;
  candidateNickname?: string;
}

export type GenerateConversationStarterResult = {
  opener: string;
  source: 'llm' | 'fallback';
  promptVersion: typeof CONVERSATION_STARTER_PROMPT_VERSION;
  model?: string;
};
