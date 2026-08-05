export {
  MATCH_NARRATIVE_PROMPT_VERSION,
  type MatchNarrativeScoreBand,
  type MatchNarrativeTraitFact,
  type MatchNarrativeProfileExcerpt,
  type MatchNarrativeFactPack,
  type GenerateMatchNarrativeResult,
} from './match-narrative.types';
export {
  scoreBandFromFinalScore,
  buildMatchNarrativeFactPack,
} from './match-narrative-fact-pack';
export {
  EXCERPT_MAX_CHARS,
  EXCERPT_MAX_COUNT,
  redactProfileFreeText,
  buildProfileExcerpts,
} from './match-narrative-redact';
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
  nextActionForLlm,
  tensionNoteFromChip,
} from './match-narrative-voice';
export { MatchNarrativeLlmSchema } from './match-narrative.schema';
export { MatchNarrativeGenerator } from './match-narrative.generator';
export {
  MatchNarrativeCacheService,
  type MatchNarrativeCacheEntry,
  type MatchNarrativeCacheKey,
} from './match-narrative-cache.service';
export {
  buildNarrativeTldr,
  NARRATIVE_TLDR_MAX_CHARS,
} from './match-narrative-tldr';
