import type { ConversationStarterFactPack } from './conversation-starter.types';

export type ConversationStarterLlmPromptFacts = {
  scoreBand: ConversationStarterFactPack['scoreBand'];
  positiveChips: string[];
  sharedInterests: string[];
  sharedInterestNote?: string;
  tensionChip?: string;
  viewerNickname?: string;
  candidateNickname?: string;
};

/** Project fact pack → lean LLM JSON (no about* free text). */
export function toConversationStarterLlmFacts(
  factPack: ConversationStarterFactPack,
): ConversationStarterLlmPromptFacts {
  const facts: ConversationStarterLlmPromptFacts = {
    scoreBand: factPack.scoreBand,
    positiveChips: [...factPack.positiveChips],
    sharedInterests: [...factPack.sharedInterests],
  };
  if (factPack.sharedInterestNote) {
    facts.sharedInterestNote = factPack.sharedInterestNote;
  }
  if (factPack.tensionChip) {
    facts.tensionChip = factPack.tensionChip;
  }
  if (factPack.viewerNickname) {
    facts.viewerNickname = factPack.viewerNickname;
  }
  if (factPack.candidateNickname) {
    facts.candidateNickname = factPack.candidateNickname;
  }
  return facts;
}

export function buildConversationStarterSystemPrompt(): string {
  return [
    'You are a dating conversation coach helping someone start a chat.',
    'Use ONLY the facts in the user JSON (sharedInterests, sharedInterestNote, positiveChips, nicknames).',
    'Generate ONE conversation opener: max 15 words, casual, preferably a question.',
    'Reference a specific shared interest or chip — never invent facts.',
    'Do NOT mention compatibility scores, algorithms, soulmates, or “great match”.',
    'Do NOT write generic openers like “Hey, how are you?”.',
    'Return JSON only: { "opener": "..." }.',
  ].join(' ');
}

export function buildConversationStarterUserPrompt(
  factPack: ConversationStarterFactPack,
): string {
  const facts = toConversationStarterLlmFacts(factPack);
  return [
    'CONTEXT (JSON):',
    JSON.stringify(facts),
    '',
    'TASK: Generate one opener (≤15 words) as JSON { "opener": "..." }.',
  ].join('\n');
}
