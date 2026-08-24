import type { BreakdownEntry } from '../../../compatibility/compatibility-score';
import type { SignalKey } from '../../../compatibility/compatibility-score';
import { COMPATIBILITY_SIGNAL_KEYS } from '../../../compatibility/compatibility-score';
import {
  expansionChipLabelForKey,
  expansionSignalDomainForKey,
  isRegisteredExpansionShadowChipKey,
} from './expansion-explainability-manifest';
import {
  DOMAIN_REPEAT_PENALTY,
  MAX_POSITIVE_CHIPS,
  POSITIVE_CHIP_BY_SIGNAL,
  SIGNAL_DOMAIN,
  TENSION_CHIP_BY_ID,
} from './match-explainability.labels';

export function isSignalKey(k: string): k is SignalKey {
  return (COMPATIBILITY_SIGNAL_KEYS as readonly string[]).includes(k);
}

function isExplainabilityChipKey(key: string): boolean {
  return isSignalKey(key) || isRegisteredExpansionShadowChipKey(key);
}

function chipLabelForKey(key: string): string | undefined {
  if (isSignalKey(key)) return POSITIVE_CHIP_BY_SIGNAL[key];
  return expansionChipLabelForKey(key);
}

function domainForKey(key: string): string {
  if (isSignalKey(key)) return SIGNAL_DOMAIN[key];
  return expansionSignalDomainForKey(key) ?? 'unknown';
}

export function compareBreakdownEntry(
  a: BreakdownEntry,
  b: BreakdownEntry,
): number {
  if (b.pairScore !== a.pairScore) return b.pairScore - a.pairScore;
  return a.key.localeCompare(b.key);
}

type TierPredicate = (e: BreakdownEntry) => boolean;

const POSITIVE_TIERS: TierPredicate[] = [
  (e) => e.self >= 7 && e.partner >= 7,
  (e) => e.pairScore >= 7,
  (e) => e.pairScore >= 6,
  (e) => e.pairScore >= 5,
];

/** Best (lowest) tier index for which this entry qualifies, or -1 if none. */
function tierIndexForEntry(e: BreakdownEntry): number {
  if (!isExplainabilityChipKey(e.key)) return -1;
  for (let i = 0; i < POSITIVE_TIERS.length; i++) {
    if (POSITIVE_TIERS[i](e)) return i;
  }
  return -1;
}

/** Higher = better candidate before diversity adjustment. */
function baseCompositeScore(tierIdx: number, pairScore: number): number {
  return (POSITIVE_TIERS.length - tierIdx) * 100 + pairScore;
}

interface ScoredLabelCandidate {
  key: string;
  label: string;
  domain: string;
  composite: number;
}

function buildLabelCandidates(
  breakdown: BreakdownEntry[],
): ScoredLabelCandidate[] {
  const bestByLabel = new Map<string, ScoredLabelCandidate>();

  for (const e of breakdown) {
    const ti = tierIndexForEntry(e);
    if (ti < 0) continue;
    const key = e.key;
    const label = chipLabelForKey(key);
    if (!label) continue;
    const domain = domainForKey(key);
    const composite = baseCompositeScore(ti, e.pairScore);
    const prev = bestByLabel.get(label);
    if (
      !prev ||
      composite > prev.composite ||
      (composite === prev.composite && key.localeCompare(prev.key) < 0)
    ) {
      bestByLabel.set(label, { key, label, domain, composite });
    }
  }

  const list = [...bestByLabel.values()];
  list.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    return a.key.localeCompare(b.key);
  });
  return list;
}

/**
 * Up to 3 positive chips: tier strength first, then soft diversity across `SIGNAL_DOMAIN`
 * so one family (e.g. ambition + money + social) does not crowd out mixed domains when
 * scores are close.
 */
export function pickPositiveChips(breakdown: BreakdownEntry[]): string[] {
  const candidates = buildLabelCandidates(breakdown);
  if (candidates.length === 0) return [];

  const selected: ScoredLabelCandidate[] = [];
  const domainCounts = new Map<string, number>();

  while (selected.length < MAX_POSITIVE_CHIPS && candidates.length > 0) {
    let bestI = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const already = domainCounts.get(c.domain) ?? 0;
      const adj = c.composite - DOMAIN_REPEAT_PENALTY * Math.max(0, already);
      if (
        adj > bestAdj ||
        (adj === bestAdj && c.key.localeCompare(candidates[bestI].key) < 0)
      ) {
        bestAdj = adj;
        bestI = i;
      }
    }
    const pick = candidates.splice(bestI, 1)[0];
    selected.push(pick);
    domainCounts.set(pick.domain, (domainCounts.get(pick.domain) ?? 0) + 1);
  }

  return selected.map((s) => s.label);
}

export function topTensionChip(
  friction: number,
  tensionMatrix: Array<{ id: string; penalty: number }>,
): string | undefined {
  if (friction < 3 || tensionMatrix.length === 0) return undefined;
  const sorted = [...tensionMatrix].sort((a, b) => {
    if (b.penalty !== a.penalty) return b.penalty - a.penalty;
    return a.id.localeCompare(b.id);
  });
  const top = sorted[0];
  if (!top) return undefined;
  return TENSION_CHIP_BY_ID[top.id] ?? top.id.replace(/_/g, ' ');
}
