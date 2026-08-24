/**
 * Deterministic match explainability: chips + one short reason.
 * No LLM, no randomness, no scoring changes — display layer only.
 */

import { pickInterestOverlapTags } from '../expansions/01-07/expansion-07-explainability';
import {
  pickPositiveChips,
  topTensionChip,
} from './match-explainability.chips';
import type {
  MatchExplainabilityDto,
  MatchExplainabilityInput,
} from './match-explainability.labels';
import { buildReasonShort } from './match-explainability.reason';

export type {
  MatchExplainabilityDto,
  MatchExplainabilityInput,
} from './match-explainability.labels';
export {
  MAX_POSITIVE_CHIPS,
  POSITIVE_CHIP_BY_SIGNAL,
  SIGNAL_DOMAIN,
  TENSION_CHIP_BY_ID,
} from './match-explainability.labels';
export { pickPositiveChips } from './match-explainability.chips';
export {
  buildReasonShort,
  pickFallbackReasonLabels,
} from './match-explainability.reason';

function buildSharedInterestNote(shared: string[]): string | undefined {
  if (shared.length === 0) return undefined;
  const labels = shared.slice(0, 3).join(', ');
  return `You both enjoy ${labels}.`;
}

export function buildMatchExplainability(
  input: MatchExplainabilityInput,
): MatchExplainabilityDto {
  const positiveChips = pickPositiveChips(input.breakdown);
  const tensionChip = topTensionChip(input.friction, input.tensionMatrix);
  const reasonShort = buildReasonShort(
    input.finalScore,
    input.friction,
    positiveChips,
    tensionChip,
    input.breakdown,
  );
  const sharedInterestNote = buildSharedInterestNote(
    input.sharedInterests ?? [],
  );
  const interestOverlapTags = pickInterestOverlapTags(
    input.sharedInterests ?? [],
  );
  return {
    positiveChips,
    ...(tensionChip !== undefined ? { tensionChip } : {}),
    reasonShort,
    ...(sharedInterestNote !== undefined ? { sharedInterestNote } : {}),
    ...(interestOverlapTags.length > 0
      ? { interestOverlapTags }
      : {}),
  };
}
