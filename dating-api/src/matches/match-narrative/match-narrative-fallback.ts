import type { MatchNarrativeFactPack } from './match-narrative.types';
import {
  containsBannedPhrase,
  nextActionForLlm,
  tensionNoteFromChip,
} from './match-narrative-voice';

const OPENER_BY_BAND: Record<MatchNarrativeFactPack['scoreBand'], string> = {
  strong: 'Overall this looks like a strong match with clear shared ground.',
  solid: 'Overall this looks like a solid match with real common ground.',
  moderate:
    'Overall this looks like a moderate fit with some meaningful overlap.',
  partial:
    'Overall this looks like a partial fit — a few clear touchpoints, not a full story yet.',
  weak: 'Overall the overlap looks limited, with only narrow pockets in common.',
};

const CLOSER_BY_BAND: Record<MatchNarrativeFactPack['scoreBand'], string> = {
  strong: 'Worth leaning in and starting a conversation.',
  solid: 'A promising pair to explore with a genuine first message.',
  moderate: 'Worth a thoughtful look — see if the overlap feels alive in chat.',
  partial: 'Proceed with curiosity; the fit may clarify after you talk.',
  weak: 'Keep expectations modest unless something unexpected clicks.',
};

/**
 * Deterministic multi-sentence fallback when the LLM fails or is ungrounded.
 * Same fact pack → same string. No chip-label lists; ignores profileExcerpts (Phase 3).
 */
export function buildFallbackMatchNarrative(
  factPack: MatchNarrativeFactPack,
): string {
  const sentences: string[] = [];
  sentences.push(OPENER_BY_BAND[factPack.scoreBand]);

  const traits = factPack.traits.slice(0, 5);
  for (const t of traits) {
    sentences.push(t.evidence.endsWith('.') ? t.evidence : `${t.evidence}.`);
  }

  if (traits.length === 0) {
    sentences.push(
      "There isn't enough shared detail yet for a longer read.",
    );
  }

  if (factPack.sharedInterestNote) {
    const note = factPack.sharedInterestNote.trim();
    sentences.push(note.endsWith('.') ? note : `${note}.`);
  } else if (factPack.sharedInterests && factPack.sharedInterests.length > 0) {
    const labels = factPack.sharedInterests.slice(0, 3).join(', ');
    sentences.push(`You both enjoy ${labels}.`);
  }

  if (factPack.tensionChip) {
    const note = tensionNoteFromChip(factPack.tensionChip).trim();
    sentences.push(note.endsWith('.') ? note : `${note}.`);
  }

  if (factPack.caution?.trim() && !containsBannedPhrase(factPack.caution)) {
    const c = factPack.caution.trim();
    sentences.push(c.endsWith('.') ? c : `${c}.`);
  }

  const next = nextActionForLlm(factPack.suggestedNextAction);
  if (next) {
    sentences.push(next.endsWith('.') ? next : `${next}.`);
  } else {
    sentences.push(CLOSER_BY_BAND[factPack.scoreBand]);
  }

  return sentences.join(' ');
}
