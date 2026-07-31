/**
 * Structured facts for hybrid LLM match narrative (Sprint 22 Story 1).
 * No aboutMe / aboutPartner / aboutRelationship — TypeScript enforces this.
 */

export const MATCH_NARRATIVE_PROMPT_VERSION = 'v2' as const;

export type MatchNarrativeScoreBand =
  | 'strong'
  | 'solid'
  | 'moderate'
  | 'partial'
  | 'weak';

export interface MatchNarrativeTraitFact {
  group: string;
  label: string;
  evidence: string;
  strength: 'strong' | 'moderate';
}

export interface MatchNarrativeFactPack {
  finalScore: number;
  scoreBand: MatchNarrativeScoreBand;
  positiveChips: string[];
  traits: MatchNarrativeTraitFact[];
  tensionChip?: string;
  sharedInterests?: string[];
  sharedInterestNote?: string;
  caution?: string;
  suggestedNextAction?: string;
}

export type GenerateMatchNarrativeResult = {
  narrative: string;
  source: 'llm' | 'fallback';
  promptVersion: typeof MATCH_NARRATIVE_PROMPT_VERSION;
};
