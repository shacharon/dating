export {
  MATCH_NARRATIVE_PROMPT_VERSION,
  type MatchNarrativeScoreBand,
  type MatchNarrativeTraitFact,
  type MatchNarrativeFactPack,
  type GenerateMatchNarrativeResult,
} from './match-narrative.types';
export {
  scoreBandFromFinalScore,
  buildMatchNarrativeFactPack,
} from './match-narrative-fact-pack';
export {
  buildMatchNarrativeSystemPrompt,
  buildMatchNarrativeUserPrompt,
  toLlmPromptFacts,
} from './match-narrative-prompt';
export { validateLlmNarrative } from './match-narrative-validate';
export { buildFallbackMatchNarrative } from './match-narrative-fallback';
export {
  BANNED_NARRATIVE_PHRASES,
  containsBannedPhrase,
  findBannedPhrase,
  tensionNoteFromChip,
} from './match-narrative-voice';
export { MatchNarrativeLlmSchema } from './match-narrative.schema';
export { MatchNarrativeGenerator } from './match-narrative.generator';
export { MatchNarrativeCacheService } from './match-narrative-cache.service';
