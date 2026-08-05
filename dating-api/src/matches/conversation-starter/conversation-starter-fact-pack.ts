import type { MatchExplainabilityDto } from '../match-explainability';
import type {
  ConversationStarterFactPack,
  ConversationStarterScoreBand,
} from './conversation-starter.types';

const MAX_CHIPS_IN_PACK = 5;

export function scoreBandFromFinalScore(
  finalScore: number,
): ConversationStarterScoreBand {
  if (finalScore >= 80) return 'strong';
  if (finalScore >= 60) return 'solid';
  if (finalScore >= 50) return 'moderate';
  if (finalScore >= 40) return 'partial';
  return 'weak';
}

function trimNick(value: string | null | undefined): string | undefined {
  const t = value?.trim();
  return t ? t : undefined;
}

export function buildConversationStarterFactPack(input: {
  finalScore: number;
  explainability: MatchExplainabilityDto;
  sharedInterests?: string[];
  viewerNickname?: string | null;
  candidateNickname?: string | null;
}): ConversationStarterFactPack {
  const pack: ConversationStarterFactPack = {
    finalScore: input.finalScore,
    scoreBand: scoreBandFromFinalScore(input.finalScore),
    positiveChips: input.explainability.positiveChips
      .map((c) => c.trim())
      .filter(Boolean)
      .slice(0, MAX_CHIPS_IN_PACK),
    sharedInterests: (input.sharedInterests ?? [])
      .map((t) => t.trim())
      .filter(Boolean),
  };

  if (input.explainability.tensionChip?.trim()) {
    pack.tensionChip = input.explainability.tensionChip.trim();
  }
  if (input.explainability.sharedInterestNote?.trim()) {
    pack.sharedInterestNote = input.explainability.sharedInterestNote.trim();
  }
  const viewerNickname = trimNick(input.viewerNickname);
  if (viewerNickname) pack.viewerNickname = viewerNickname;
  const candidateNickname = trimNick(input.candidateNickname);
  if (candidateNickname) pack.candidateNickname = candidateNickname;

  return pack;
}
