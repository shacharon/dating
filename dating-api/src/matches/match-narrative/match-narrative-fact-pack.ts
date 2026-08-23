import type { MatchExplainabilityDto } from '../explainability/core/match-explainability';
import {
  buildMatchExplanationTraits,
  type MatchExplanationTrait,
} from '../explainability/core/match-explanation-traits';
import {
  buildProfileExcerpts,
  type ProfileAboutFields,
} from './match-narrative-redact';
import type {
  MatchNarrativeFactPack,
  MatchNarrativeScoreBand,
} from './match-narrative.types';

export function scoreBandFromFinalScore(
  finalScore: number,
): MatchNarrativeScoreBand {
  if (finalScore >= 80) return 'strong';
  if (finalScore >= 60) return 'solid';
  if (finalScore >= 50) return 'moderate';
  if (finalScore >= 40) return 'partial';
  return 'weak';
}

export function buildMatchNarrativeFactPack(input: {
  finalScore: number;
  explainability: MatchExplainabilityDto;
  recommendation?: { caution?: string; suggestedNextAction?: string };
  traits?: MatchExplanationTrait[];
  sharedInterests?: string[];
  viewerAbout?: ProfileAboutFields;
  candidateAbout?: ProfileAboutFields;
}): MatchNarrativeFactPack {
  const { finalScore, explainability, recommendation } = input;
  const traits =
    input.traits ??
    buildMatchExplanationTraits(explainability.positiveChips, finalScore);

  const pack: MatchNarrativeFactPack = {
    finalScore,
    scoreBand: scoreBandFromFinalScore(finalScore),
    positiveChips: [...explainability.positiveChips],
    traits: traits.map((t) => ({
      group: t.group,
      label: t.label,
      evidence: t.evidence,
      strength: t.strength,
    })),
  };

  if (explainability.tensionChip) {
    pack.tensionChip = explainability.tensionChip;
  }
  if (explainability.sharedInterestNote) {
    pack.sharedInterestNote = explainability.sharedInterestNote;
  }
  if (input.sharedInterests && input.sharedInterests.length > 0) {
    pack.sharedInterests = [...input.sharedInterests];
  }
  if (recommendation?.caution) {
    pack.caution = recommendation.caution;
  }
  if (recommendation?.suggestedNextAction) {
    pack.suggestedNextAction = recommendation.suggestedNextAction;
  }

  if (input.viewerAbout || input.candidateAbout) {
    const excerpts = buildProfileExcerpts({
      viewer: input.viewerAbout ?? {},
      candidate: input.candidateAbout ?? {},
    });
    if (excerpts.length > 0) {
      pack.profileExcerpts = excerpts;
    }
  }

  return pack;
}
