/**
 * Dev-only: compare legacy vs current HG five-signal ranker on a fixed synthetic pool (tie rates).
 * Run: npx ts-node scripts/hg-ranking-before-after.ts
 */
import { MATCHING_CANONICAL_MODEL_VERSION } from '../src/canonical/matching-canonical.types';
import type { MatchingCanonicalModel, MatchingRankingSignalsSnapshot } from '../src/canonical/matching-canonical.types';
import { computeHolyGrailFiveSignalRank } from '../src/holy-grail-matching/holy-grail-five-signal-ranking';

function model(profileId: string, rs: MatchingRankingSignalsSnapshot): MatchingCanonicalModel {
  return {
    version: MATCHING_CANONICAL_MODEL_VERSION,
    profileId,
    facts: {},
    preferences: {},
    searchOverrides: {},
    rankingSignals: rs,
  };
}

/** Legacy v1 (pre-tune) — duplicated for A/B only. */
function legacyRank(searcher: MatchingCanonicalModel, candidate: MatchingCanonicalModel): number {
  const W = { dailyRhythm: 18, autonomyTogetherness: 18, conflictStyle: 22, lifestylePace: 22, interestsTop: 20 };
  const s = searcher.rankingSignals ?? {
    dailyRhythm: null,
    autonomyTogetherness: null,
    conflictStyle: null,
    lifestylePace: null,
    interestsTop: [],
  };
  const c = candidate.rankingSignals ?? {
    dailyRhythm: null,
    autonomyTogetherness: null,
    conflictStyle: null,
    lifestylePace: null,
    interestsTop: [],
  };
  let t = 0;
  const lab = (a: string | null, b: string | null, w: number) => {
    if (a !== null && b !== null && a === b) t += w;
  };
  lab(s.dailyRhythm, c.dailyRhythm, W.dailyRhythm);
  lab(s.autonomyTogetherness, c.autonomyTogetherness, W.autonomyTogetherness);
  const num = (a: number | null, b: number | null, w: number) => {
    if (a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b)) {
      t += (Math.max(0, 10 - Math.abs(a - b)) / 10) * w;
    }
  };
  num(s.conflictStyle, c.conflictStyle, W.conflictStyle);
  num(s.lifestylePace, c.lifestylePace, W.lifestylePace);
  const sa = new Set(
    s.interestsTop.map((x) => x.trim().toLowerCase().replace(/\s+/g, ' ')).filter((x) => x.length > 0),
  );
  const sb = new Set(
    c.interestsTop.map((x) => x.trim().toLowerCase().replace(/\s+/g, ' ')).filter((x) => x.length > 0),
  );
  if (sa.size > 0 && sb.size > 0) {
    let inter = 0;
    for (const x of sa) if (sb.has(x)) inter += 1;
    t += (inter / Math.max(sa.size, sb.size)) * W.interestsTop;
  }
  return Math.round(t * 100) / 100;
}

function tieRate(scores: number[]): number {
  const m = new Map<number, number>();
  for (const x of scores) m.set(x, (m.get(x) ?? 0) + 1);
  let tied = 0;
  for (const c of m.values()) if (c > 1) tied += c;
  return scores.length > 0 ? (100 * tied) / scores.length : 0;
}

const searcher = model('searcher-x', {
  dailyRhythm: 'early',
  autonomyTogetherness: 'balanced',
  conflictStyle: 6,
  lifestylePace: 5,
  interestsTop: ['run', 'read', 'cook'],
});

const candidates: MatchingRankingSignalsSnapshot[] = [
  { dailyRhythm: 'early', autonomyTogetherness: 'balanced', conflictStyle: 6, lifestylePace: 5, interestsTop: ['run', 'read'] },
  { dailyRhythm: 'late', autonomyTogetherness: 'balanced', conflictStyle: 7, lifestylePace: 5, interestsTop: ['run', 'yoga'] },
  { dailyRhythm: null, autonomyTogetherness: null, conflictStyle: 6, lifestylePace: null, interestsTop: [] },
  { dailyRhythm: 'early', autonomyTogetherness: null, conflictStyle: null, lifestylePace: 5, interestsTop: ['run'] },
  { dailyRhythm: null, autonomyTogetherness: null, conflictStyle: null, lifestylePace: null, interestsTop: [] },
  { dailyRhythm: null, autonomyTogetherness: null, conflictStyle: null, lifestylePace: null, interestsTop: [] },
  { dailyRhythm: 'late', autonomyTogetherness: 'solo', conflictStyle: 3, lifestylePace: 8, interestsTop: ['ski'] },
  { dailyRhythm: 'early', autonomyTogetherness: 'balanced', conflictStyle: 6, lifestylePace: 5, interestsTop: ['run', 'read', 'cook'] },
  { dailyRhythm: 'early', autonomyTogetherness: 'balanced', conflictStyle: 6, lifestylePace: 5, interestsTop: ['run', 'read', 'cook'] },
  { dailyRhythm: null, autonomyTogetherness: null, conflictStyle: null, lifestylePace: null, interestsTop: ['only'] },
];

function main(): void {
  const legacyScores: number[] = [];
  const newScores: number[] = [];
  const rows: { id: string; legacy: number; next: number }[] = [];
  let i = 0;
  for (const rs of candidates) {
    const id = `cand-${String(i++).padStart(2, '0')}`;
    const cand = model(id, rs);
    const L = legacyRank(searcher, cand);
    const N = computeHolyGrailFiveSignalRank({ searcher, candidate: cand }).rankScore;
    legacyScores.push(L);
    newScores.push(N);
    rows.push({ id, legacy: L, next: N });
  }

  console.log(JSON.stringify({ tiePctLegacy: tieRate(legacyScores), tiePctNew: tieRate(newScores), rows }, null, 2));
}

main();
