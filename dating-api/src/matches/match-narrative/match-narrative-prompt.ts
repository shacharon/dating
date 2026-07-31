import type { MatchNarrativeFactPack } from './match-narrative.types';
import {
  BANNED_NARRATIVE_PHRASES,
  tensionNoteFromChip,
} from './match-narrative-voice';

export type LlmPromptFacts = {
  scoreBand: MatchNarrativeFactPack['scoreBand'];
  evidence: string[];
  tensionNote?: string;
  sharedInterests?: string[];
  sharedInterestNote?: string;
  caution?: string;
  suggestedNextAction?: string;
};

/** Project fact pack → lean LLM JSON (no chip labels / trait labels). */
export function toLlmPromptFacts(
  factPack: MatchNarrativeFactPack,
): LlmPromptFacts {
  const evidence = factPack.traits
    .map((t) => t.evidence.trim())
    .filter((e) => e.length > 0)
    .slice(0, 5);

  const facts: LlmPromptFacts = {
    scoreBand: factPack.scoreBand,
    evidence,
  };

  if (factPack.tensionChip) {
    facts.tensionNote = tensionNoteFromChip(factPack.tensionChip);
  }
  if (factPack.sharedInterests && factPack.sharedInterests.length > 0) {
    facts.sharedInterests = [...factPack.sharedInterests];
  }
  if (factPack.sharedInterestNote) {
    facts.sharedInterestNote = factPack.sharedInterestNote;
  }
  if (factPack.caution) {
    facts.caution = factPack.caution;
  }
  if (factPack.suggestedNextAction) {
    facts.suggestedNextAction = factPack.suggestedNextAction;
  }

  return facts;
}

/**
 * System prompt for constrained match narrative (Phase 2 hybrid, Story 4 voice).
 */
export function buildMatchNarrativeSystemPrompt(): string {
  const banned = BANNED_NARRATIVE_PHRASES.join(', ');
  return [
    'You write like a sharp friend explaining why two people should meet — concrete, specific, never a brochure.',
    'Use ONLY the facts in the user JSON (evidence sentences, shared interests, tensionNote, caution, suggestedNextAction).',
    'Do not invent biography, personality, quotes, or details that are not listed.',
    'Write 5–12 complete English sentences. Scale length with how many evidence/interest/tension facts exist — never pad with fluff.',
    'One clear idea per sentence. Prefer verbs people use (e.g. you both go hard on goals) over product nouns.',
    `Never use these words or phrases (case-insensitive): ${banned}, or metric "score"/"scores".`,
    'If tensionNote is present, include it honestly in 1–2 sentences.',
    'Do not mention numeric scores, percentages, compatibility, or friction as metrics.',
    'Respond with JSON only: { "narrative": "<paragraph text>" }.',
  ].join(' ');
}

/**
 * User prompt: lean fact projection only. No chip labels / about* fields.
 */
export function buildMatchNarrativeUserPrompt(
  factPack: MatchNarrativeFactPack,
): string {
  const payload = toLlmPromptFacts(factPack);

  return [
    'Write the match narrative from these structured facts only.',
    'Do not use any profile free-text; only the JSON below.',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
}
