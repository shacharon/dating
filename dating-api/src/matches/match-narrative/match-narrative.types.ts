/**
 * Structured facts for hybrid LLM match narrative (Sprint 22 + Sprint 23 Phase 3).
 * Raw aboutMe / aboutPartner / aboutRelationship are NOT on this type —
 * only redacted `profileExcerpts` when Phase 3 is wired.
 */

export const MATCH_NARRATIVE_PROMPT_VERSION = 'v4' as const;

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

export type MatchNarrativeProfileExcerpt = {
  role: 'viewer' | 'candidate';
  field: 'aboutMe' | 'aboutPartner' | 'aboutRelationship';
  /** Already redacted + truncated. */
  text: string;
};

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
  /** Phase 3 — redacted capped excerpts only. */
  profileExcerpts?: MatchNarrativeProfileExcerpt[];
}

export type GenerateMatchNarrativeResult = {
  narrative: string;
  source: 'llm' | 'fallback';
  promptVersion: typeof MATCH_NARRATIVE_PROMPT_VERSION;
};
