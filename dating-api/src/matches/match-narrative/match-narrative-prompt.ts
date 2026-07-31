import type { MatchNarrativeFactPack } from './match-narrative.types';
import {
  BANNED_NARRATIVE_PHRASES,
  containsBannedPhrase,
  nextActionForLlm,
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
  profileExcerpts?: Array<{
    role: 'viewer' | 'candidate';
    field: 'aboutMe' | 'aboutPartner' | 'aboutRelationship';
    text: string;
  }>;
};

function cautionForLlm(raw?: string): string | undefined {
  if (!raw?.trim()) return undefined;
  if (containsBannedPhrase(raw)) return undefined;
  return raw.trim();
}

/** Project fact pack → lean LLM JSON (no chip labels / trait labels / raw about*). */
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
  const caution = cautionForLlm(factPack.caution);
  if (caution) {
    facts.caution = caution;
  }
  const next = nextActionForLlm(factPack.suggestedNextAction);
  if (next) {
    facts.suggestedNextAction = next;
  }
  if (factPack.profileExcerpts && factPack.profileExcerpts.length > 0) {
    facts.profileExcerpts = factPack.profileExcerpts.map((e) => ({
      role: e.role,
      field: e.field,
      text: e.text,
    }));
  }

  return facts;
}

/**
 * System prompt for constrained match narrative (Phase 3 hybrid + voice v3 bans).
 */
export function buildMatchNarrativeSystemPrompt(): string {
  const banned = BANNED_NARRATIVE_PHRASES.join(', ');
  return [
    'You write like a sharp friend explaining why two people should meet — concrete, specific, never a brochure.',
    'Use ONLY the facts in the user JSON (evidence sentences, shared interests, tensionNote, caution, suggestedNextAction, profileExcerpts).',
    'You may lightly paraphrase or quote short phrases only from profileExcerpts when they support the structured evidence.',
    'Do not invent biography, personality, quotes, or details that are not listed in evidence, interests, or profileExcerpts.',
    'Never repeat redacted markers or speculate what was removed. Prefer tone/overlap (music) over long block quotes — at most 1–2 short echoes.',
    'Write 5–12 complete English sentences. Scale length with how many evidence/interest/tension/excerpt facts exist — never pad with fluff.',
    'One clear idea per sentence. Prefer short verbs people use (e.g. you both go hard on goals) over product nouns or essay transitions.',
    `Never use these words or phrases (case-insensitive): ${banned}, or metric "score"/"scores".`,
    'If tensionNote is present, include it honestly in 1–2 sentences.',
    'End with a concrete next beat (what to ask or what to watch) or honest tension — never soft brochure closers like mutual appreciation, meaningful conversations, worth a closer look, or one-on-one setting.',
    'Do not mention numeric scores, percentages, compatibility, or friction as metrics.',
    'Respond with JSON only: { "narrative": "<paragraph text>" }.',
  ].join(' ');
}

/**
 * User prompt: lean fact projection. Excerpts only as listed (already redacted).
 */
export function buildMatchNarrativeUserPrompt(
  factPack: MatchNarrativeFactPack,
): string {
  const payload = toLlmPromptFacts(factPack);

  return [
    'Write the match narrative from these structured facts.',
    'Use structured facts; you may use profileExcerpts only as listed (already redacted).',
    JSON.stringify(payload, null, 2),
  ].join('\n\n');
}
