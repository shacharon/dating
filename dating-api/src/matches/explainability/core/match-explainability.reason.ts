import type { BreakdownEntry } from '../../../compatibility/compatibility-score';
import {
  compareBreakdownEntry,
  isSignalKey,
} from './match-explainability.chips';
import { POSITIVE_CHIP_BY_SIGNAL } from './match-explainability.labels';
import {
  emptyBody,
  fallbackHintsBody,
  tensionSuffix,
  withChipsBody,
} from './match-explainability.reason-templates';

function joinChips(chips: string[]): string {
  if (chips.length === 0) return '';
  if (chips.length === 1) return chips[0];
  if (chips.length === 2) return `${chips[0]} and ${chips[1]}`;
  const head = chips.slice(0, -1).join(', ');
  return `${head}, and ${chips[chips.length - 1]}`;
}

/** Stable fingerprint for template rotation (no randomness). */
function reasonVariantKey(
  finalScore: number,
  positiveChips: string[],
  breakdown: BreakdownEntry[],
): number {
  let h = finalScore * 131 + positiveChips.length * 17;
  if (positiveChips[0]) {
    for (let i = 0; i < positiveChips[0].length; i++) {
      h = (h * 31 + positiveChips[0].charCodeAt(i)) >>> 0;
    }
  }
  h = (h + breakdown.length * 13) >>> 0;
  return h;
}

function pickSecondaryLabelWithMinPairScore(
  breakdown: BreakdownEntry[],
  excludeLabels: Set<string>,
  minPairScore: number,
): string | undefined {
  const candidates = breakdown
    .filter((e) => isSignalKey(e.key) && e.pairScore >= minPairScore)
    .map((e) => ({
      label: POSITIVE_CHIP_BY_SIGNAL[e.key],
      pairScore: e.pairScore,
      key: e.key,
    }))
    .filter((c) => !excludeLabels.has(c.label))
    .sort((a, b) => {
      if (b.pairScore !== a.pairScore) return b.pairScore - a.pairScore;
      return a.key.localeCompare(b.key);
    });
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    return c.label;
  }
  return undefined;
}

/** Secondary prose when one chip: pairScore ≥ 5 (display-only). */
function pickWeakSecondaryLabel(
  breakdown: BreakdownEntry[],
  excludeLabels: Set<string>,
): string | undefined {
  return pickSecondaryLabelWithMinPairScore(breakdown, excludeLabels, 5);
}

/** Mid-band single-chip line: try ≥5 then ≥4 so a named hint almost always exists. */
function pickMidSecondaryHint(
  breakdown: BreakdownEntry[],
  excludeLabels: Set<string>,
): string | undefined {
  return (
    pickSecondaryLabelWithMinPairScore(breakdown, excludeLabels, 5) ??
    pickSecondaryLabelWithMinPairScore(breakdown, excludeLabels, 4)
  );
}

/**
 * When no chip-tier alignments exist, still name up to `max` moderate pairScore rows in prose (chips stay empty).
 */
export function pickFallbackReasonLabels(
  breakdown: BreakdownEntry[],
  max = 2,
): string[] {
  const batch = breakdown
    .filter((e) => isSignalKey(e.key) && e.pairScore >= 6)
    .sort(compareBreakdownEntry);
  const seenLabels = new Set<string>();
  const out: string[] = [];
  for (const e of batch) {
    if (out.length >= max) break;
    const label = POSITIVE_CHIP_BY_SIGNAL[e.key];
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      out.push(label);
    }
  }
  return out;
}

export function buildReasonShort(
  finalScore: number,
  friction: number,
  positiveChips: string[],
  tensionChip: string | undefined,
  breakdown: BreakdownEntry[],
): string {
  const vk = reasonVariantKey(finalScore, positiveChips, breakdown);
  let body: string;

  if (positiveChips.length === 0) {
    const hints = pickFallbackReasonLabels(breakdown);
    if (hints.length > 0) {
      body = fallbackHintsBody(finalScore, joinChips(hints), vk, hints.length);
    } else {
      body = emptyBody(finalScore, vk);
    }
  } else {
    const chipCount = positiveChips.length;
    const chipsJoined = joinChips(positiveChips);
    const chipSet = new Set(positiveChips);

    if (chipCount === 1 && finalScore < 30) {
      body = `Overall this looks weak; there's a small overlap on ${positiveChips[0]}, but it's outweighed by gaps.`;
    } else if (chipCount === 1 && finalScore >= 50 && finalScore < 60) {
      const hint =
        pickMidSecondaryHint(breakdown, chipSet) ??
        'other areas that score softer';
      body = `Primary overlap on ${positiveChips[0]}; there's also some alignment on ${hint}, but overall it stays moderate.`;
    } else {
      const variantBase = vk + (Math.floor(finalScore / 13) % 3) * 5;
      body = withChipsBody(finalScore, chipsJoined, variantBase, chipCount);
      if (chipCount === 1 && finalScore >= 30) {
        const sec = pickWeakSecondaryLabel(breakdown, chipSet);
        if (sec) {
          body += ` Softer overlap also shows around ${sec}.`;
        }
      }
    }
  }

  if (friction >= 3 && tensionChip) {
    body += tensionSuffix(tensionChip, vk);
  }

  return body;
}
