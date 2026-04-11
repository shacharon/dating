/**
 * Full DB batch: lifestyle v2 + interestTags v2 + personalityTraits v2 (taxonomy tier only where applicable).
 * Metrics support the **production-freeze** doc in `docs/HOLY_GRAIL_MATCHING.md` (V2 overlays: additive-only, no
 * eligibility, frozen bonus caps in `holy-grail-five-signal-ranking.ts`).
 *
 * Outputs: v2 coverage, % profiles with ≥1 v2 tag/family, grounded-tag frequencies from rank notes,
 * profile-level family co-occurrence, rank delta baseline vs full rank (top 50), bonus point distributions.
 *
 * Run from dating-api:
 *   npx ts-node scripts/hg-v2-enrichment-batch-analysis.ts
 *
 * Env:
 *   DATABASE_URL            (required)
 *   HG_V2_MAX_ORDERED_PAIRS cap pairwise loop (default: min(n*(n-1), 2_000_000))
 *   HG_V2_RANK_SEARCHERS    searchers for top-50 delta (default: min(50, n))
 */
import 'dotenv/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { MatchingCanonicalModel } from '../src/canonical/matching-canonical.types';
import {
  computeHolyGrailFiveSignalRank,
  computeHolyGrailRankingPurityRank,
} from '../src/holy-grail-matching/holy-grail-five-signal-ranking';
import { INTEREST_TAGS_V2_TAG_SET } from '../src/holy-grail-matching/interest-tags-text.extract';
import { LIFESTYLE_SIGNAL_V2_TAG_SET } from '../src/holy-grail-matching/lifestyle-signals-text.extract';
import {
  PERSONALITY_TRAIT_V2_TAG_SET,
} from '../src/holy-grail-matching/personality-traits-text.extract';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import {
  buildHolyGrailProfileMappingInputFromRankingAwareDbRow,
  type HolyGrailRankingAwareDbRow,
} from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../src/matches/match-detail-children-unsure';
import type { ChildrenUnsureProfileRow } from '../src/matches/children-unsure-profile-row.types';

const OUTPUT_JSON =
  process.env.HG_V2_BATCH_OUTPUT ?? path.join(__dirname, '.hg-v2-enrichment-batch-output.json');
const DEFAULT_MAX_PAIRS = 2_000_000;

function pct(n: number, d: number): number {
  if (d <= 0) return 0;
  return Math.round((1e4 * n) / d) / 100;
}

function bump(m: Map<string, number>, k: string, n = 1): void {
  m.set(k, (m.get(k) ?? 0) + n);
}

function rowToCanonical(row: ChildrenUnsureProfileRow): MatchingCanonicalModel {
  return mapProfileSourceToMatchingCanonical(
    buildHolyGrailProfileMappingInputFromRankingAwareDbRow(row as unknown as HolyGrailRankingAwareDbRow),
  );
}

function v2TagsPersonality(m: MatchingCanonicalModel): string[] {
  const rs = m.rankingSignals;
  if (!rs) return [];
  const all = [...(rs.personalityTraitsSelf ?? []), ...(rs.personalityTraitsPartner ?? [])];
  return [...new Set(all.filter((t) => PERSONALITY_TRAIT_V2_TAG_SET.has(t)))];
}

function v2TagsLifestyle(m: MatchingCanonicalModel): string[] {
  const rs = m.rankingSignals;
  if (!rs) return [];
  const all = [...(rs.lifestyleSignalsSelf ?? []), ...(rs.lifestyleSignalsPartner ?? [])];
  return [...new Set(all.filter((t) => LIFESTYLE_SIGNAL_V2_TAG_SET.has(t)))];
}

function v2TagsInterest(m: MatchingCanonicalModel): string[] {
  const rs = m.rankingSignals;
  if (!rs) return [];
  const all = [...(rs.interestTagsSelf ?? []), ...(rs.interestTagsPartner ?? [])];
  return [...new Set(all.filter((t) => INTEREST_TAGS_V2_TAG_SET.has(t)))];
}

function parseGroundedTags(note: string, prefix: string): string[] {
  const p = `${prefix}:grounded(`;
  if (!note.startsWith(p)) return [];
  const rest = note.slice(p.length);
  const idx = rest.indexOf(',O=');
  const blob = idx >= 0 ? rest.slice(0, idx) : rest.replace(/\)$/, '');
  if (!blob) return [];
  return blob.split(';').map((s) => s.trim()).filter(Boolean);
}

function histogram(arr: number[], bins: number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const b of bins) out[`<=${b}`] = 0;
  out['>max'] = 0;
  for (const x of arr) {
    let placed = false;
    for (const b of bins) {
      if (x <= b) {
        out[`<=${b}`] += 1;
        placed = true;
        break;
      }
    }
    if (!placed) out['>max'] += 1;
  }
  return out;
}

function percentiles(sorted: number[], ps: number[]): Record<string, number> {
  if (sorted.length === 0) return Object.fromEntries(ps.map((p) => [`p${p}`, 0]));
  const out: Record<string, number> = {};
  for (const p of ps) {
    const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * (sorted.length - 1)));
    out[`p${p}`] = sorted[idx]!;
  }
  return out;
}

function main(): void {
  const url = process.env.DATABASE_URL;
  if (!url?.trim()) {
    throw new Error('DATABASE_URL is not set');
  }

  const maxPairBudget = Math.max(
    1000,
    parseInt(process.env.HG_V2_MAX_ORDERED_PAIRS ?? String(DEFAULT_MAX_PAIRS), 10) || DEFAULT_MAX_PAIRS,
  );
  const rankSearchers = Math.max(1, parseInt(process.env.HG_V2_RANK_SEARCHERS ?? '50', 10) || 50);

  const prisma = new PrismaClient();
  void (async () => {
    const rows = (await prisma.userProfile.findMany({
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
      orderBy: { id: 'asc' },
    })) as ChildrenUnsureProfileRow[];

    const n = rows.length;
    const models: MatchingCanonicalModel[] = [];
    const mapFailed: string[] = [];
    for (const r of rows) {
      try {
        models.push(rowToCanonical(r));
      } catch {
        mapFailed.push(r.id);
      }
    }

    if (models.length < 2) {
      throw new Error(`Need ≥2 mappable profiles (have ${models.length}, ${mapFailed.length} map failures)`);
    }

    const nM = models.length;
    const tax = {
      personalityV2Universe: PERSONALITY_TRAIT_V2_TAG_SET.size,
      lifestyleV2Universe: LIFESTYLE_SIGNAL_V2_TAG_SET.size,
      interestV2Universe: INTEREST_TAGS_V2_TAG_SET.size,
    };

    const seenP = new Set<string>();
    const seenL = new Set<string>();
    const seenI = new Set<string>();
    let withP = 0;
    let withL = 0;
    let withI = 0;

    for (const m of models) {
      const p = v2TagsPersonality(m);
      const l = v2TagsLifestyle(m);
      const it = v2TagsInterest(m);
      if (p.length) withP += 1;
      if (l.length) withL += 1;
      if (it.length) withI += 1;
      for (const t of p) seenP.add(t);
      for (const t of l) seenL.add(t);
      for (const t of it) seenI.add(t);
    }

    /** Profiles with ≥1 v2 tag in family (co-occurrence at profile grain). */
    let co_PP = 0,
      co_PL = 0,
      co_PI = 0,
      co_LL = 0,
      co_LI = 0,
      co_II = 0;
    let triple = 0;
    for (const m of models) {
      const hp = v2TagsPersonality(m).length > 0;
      const hl = v2TagsLifestyle(m).length > 0;
      const hi = v2TagsInterest(m).length > 0;
      if (hp && hl) co_PL += 1;
      if (hp && hi) co_PI += 1;
      if (hl && hi) co_LI += 1;
      if (hp) co_PP += 1;
      if (hl) co_LL += 1;
      if (hi) co_II += 1;
      if (hp && hl && hi) triple += 1;
    }

    const coOccurrenceProfiles = {
      labels: ['personalityV2', 'lifestyleV2', 'interestV2'] as const,
      /** Symmetric counts: profiles with both families ≥1 v2 tag. */
      matrix: [
        [co_PP, co_PL, co_PI],
        [co_PL, co_LL, co_LI],
        [co_PI, co_LI, co_II],
      ],
      profilesWithAllThreeV2Families: triple,
      pctProfilesWithAllThree: pct(triple, nM),
    };

    const groundedPers = new Map<string, number>();
    const groundedLife = new Map<string, number>();
    const groundedInt = new Map<string, number>();
    /** Grounded tags restricted to v2 allowlist (intersections can include v1 tags). */
    const groundedPersV2 = new Map<string, number>();
    const groundedLifeV2 = new Map<string, number>();
    const groundedIntV2 = new Map<string, number>();

    const bonusP: number[] = [];
    const bonusL: number[] = [];
    const bonusI: number[] = [];
    const bonusSumPLI: number[] = [];

    const maxNatural = nM * (nM - 1);
    const pairLimit = Math.min(maxPairBudget, maxNatural);
    let pairsProcessed = 0;

    outerPairs: for (let i = 0; i < nM; i++) {
      for (let j = 0; j < nM; j++) {
        if (i === j) continue;
        if (pairsProcessed >= pairLimit) break outerPairs;
        pairsProcessed += 1;
        const searcher = models[i]!;
        const candidate = models[j]!;
        const full = computeHolyGrailFiveSignalRank({ searcher, candidate });
        for (const b of full.rankBreakdown) {
          if (b.signal === 'personalityTraits' && b.points > 0) {
            bonusP.push(b.points);
            for (const t of parseGroundedTags(b.note, 'personalityTraits')) {
              bump(groundedPers, t);
              if (PERSONALITY_TRAIT_V2_TAG_SET.has(t)) bump(groundedPersV2, t);
            }
          }
          if (b.signal === 'lifestyleSignals' && b.points > 0) {
            bonusL.push(b.points);
            for (const t of parseGroundedTags(b.note, 'lifestyleSignals')) {
              bump(groundedLife, t);
              if (LIFESTYLE_SIGNAL_V2_TAG_SET.has(t)) bump(groundedLifeV2, t);
            }
          }
          if (b.signal === 'interestTags' && b.points > 0) {
            bonusI.push(b.points);
            for (const t of parseGroundedTags(b.note, 'interestTags')) {
              bump(groundedInt, t);
              if (INTEREST_TAGS_V2_TAG_SET.has(t)) bump(groundedIntV2, t);
            }
          }
        }
        let s = 0;
        for (const b of full.rankBreakdown) {
          if (
            (b.signal === 'personalityTraits' ||
              b.signal === 'lifestyleSignals' ||
              b.signal === 'interestTags') &&
            b.points > 0
          ) {
            s += b.points;
          }
        }
        if (s > 0) bonusSumPLI.push(s);
      }
    }

    const searchersToRun = Math.min(rankSearchers, nM);
    const topK = 50;
    let sumOverlapFracTop50 = 0;
    let sumMeanAbsShift = 0;
    let rankRuns = 0;

    for (let si = 0; si < searchersToRun; si++) {
      const searcher = models[si]!;
      type Scored = { id: string; base: number; full: number };
      const row: Scored[] = [];
      for (let j = 0; j < nM; j++) {
        if (j === si) continue;
        const c = models[j]!;
        row.push({
          id: c.profileId,
          base: computeHolyGrailRankingPurityRank({ searcher, candidate: c }).rankScore,
          full: computeHolyGrailFiveSignalRank({ searcher, candidate: c }).rankScore,
        });
      }
      row.sort((a, b) => (b.base !== a.base ? b.base - a.base : a.id.localeCompare(b.id)));
      const baseTop = row.slice(0, Math.min(topK, row.length)).map((x) => x.id);
      row.sort((a, b) => (b.full !== a.full ? b.full - a.full : a.id.localeCompare(b.id)));
      const fullTop = new Set(row.slice(0, Math.min(topK, row.length)).map((x) => x.id));
      let inter = 0;
      for (const id of baseTop) if (fullTop.has(id)) inter += 1;
      sumOverlapFracTop50 += inter / Math.min(topK, baseTop.length);

      const fullRank = new Map<string, number>();
      row.forEach((x, idx) => fullRank.set(x.id, idx));

      const baseOrder = [...row].sort((a, b) =>
        b.base !== a.base ? b.base - a.base : a.id.localeCompare(b.id),
      );
      const baseRankMap = new Map<string, number>();
      baseOrder.forEach((x, idx) => baseRankMap.set(x.id, idx));

      let shiftSum = 0;
      for (const id of baseTop) {
        shiftSum += Math.abs((fullRank.get(id) ?? 0) - (baseRankMap.get(id) ?? 0));
      }
      sumMeanAbsShift += shiftSum / Math.min(topK, baseTop.length);
      rankRuns += 1;
    }

    const sortBonus = (a: number, b: number) => a - b;
    bonusP.sort(sortBonus);
    bonusL.sort(sortBonus);
    bonusI.sort(sortBonus);
    bonusSumPLI.sort(sortBonus);

    const out = {
      meta: {
        totalDbProfiles: n,
        mappableProfiles: nM,
        mapFailedProfileIds: mapFailed.slice(0, 50),
        mapFailedCount: mapFailed.length,
        orderedPairsProcessed: pairsProcessed,
        orderedPairsCap: pairLimit,
        naturalOrderedPairs: maxNatural,
        pairSamplingNote:
          pairsProcessed < maxNatural
            ? `capped: processed ${pairsProcessed} of ${maxNatural} ordered pairs`
            : 'full ordered pair sweep',
        rankDeltaSearchers: rankRuns,
        topK,
        baselineRanker: 'computeHolyGrailRankingPurityRank',
        fullRanker:
          'computeHolyGrailFiveSignalRank (purity + similarityPreference + personality + lifestyle + interest overlays)',
        noteRankDelta:
          'Top-50 overlap is |baselineTop50 ∩ fullTop50|/50 per searcher (not Jaccard). Full rank includes similarityPreference Δ, not only the three tag families.',
      },
      v2TaxonomyUniverseSizes: tax,
      coverageOfV2Taxonomy: {
        /** Distinct v2 tags observed / universe size */
        personalityV2: pct(seenP.size, tax.personalityV2Universe),
        lifestyleV2: pct(seenL.size, tax.lifestyleV2Universe),
        interestV2: pct(seenI.size, tax.interestV2Universe),
        distinctTagsObserved: {
          personalityV2: seenP.size,
          lifestyleV2: seenL.size,
          interestV2: seenI.size,
        },
      },
      pctProfilesWithAtLeastOneV2Tag: {
        personalityV2: pct(withP, nM),
        lifestyleV2: pct(withL, nM),
        interestV2: pct(withI, nM),
        anyOfThreeFamilies: pct(
          models.filter(
            (m) =>
              v2TagsPersonality(m).length + v2TagsLifestyle(m).length + v2TagsInterest(m).length >
              0,
          ).length,
          nM,
        ),
      },
      groundedTagFrequencyInRankNotes: {
        /** All tags appearing in grounded(…) notes (may include v1 personality/lifestyle/interest where intersection used them). */
        personality_allTagsTop: Object.fromEntries(
          [...groundedPers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
        ),
        lifestyle_allTagsTop: Object.fromEntries(
          [...groundedLife.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
        ),
        interest_allTagsTop: Object.fromEntries(
          [...groundedInt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
        ),
        /** v2-only hits inside the same grounded lists (families-of-interest). */
        personality_v2TagsOnlyTop: Object.fromEntries(
          [...groundedPersV2.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
        ),
        lifestyle_v2TagsOnlyTop: Object.fromEntries(
          [...groundedLifeV2.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
        ),
        interest_v2TagsOnlyTop: Object.fromEntries(
          [...groundedIntV2.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20),
        ),
        totalGroundedTagHits_allVsV2only: {
          personality: { all: sumMap(groundedPers), v2Only: sumMap(groundedPersV2) },
          lifestyle: { all: sumMap(groundedLife), v2Only: sumMap(groundedLifeV2) },
          interest: { all: sumMap(groundedInt), v2Only: sumMap(groundedIntV2) },
        },
      },
      profileCoOccurrenceV2: coOccurrenceProfiles,
      rankDeltaVsHgOnlyBaselineTop50: {
        meanFractionBaselineTop50AlsoInFullTop50: rankRuns
          ? Math.round((1e4 * sumOverlapFracTop50) / rankRuns) / 1e4
          : 0,
        /** Mean over searchers of (mean |rank_full - rank_baseline| for ids in baseline top 50). */
        meanMeanAbsRankShiftAmongBaselineTop50: rankRuns
          ? Math.round((1e6 * sumMeanAbsShift) / rankRuns) / 1e6
          : 0,
      },
      bonusPointDistributions: {
        personalityTraitsOverlay: {
          count: bonusP.length,
          ...percentiles(bonusP, [50, 90, 95, 99]),
          histogram: histogram(bonusP, [0, 0.25, 0.5, 1, 1.5, 2]),
        },
        lifestyleSignalsOverlay: {
          count: bonusL.length,
          ...percentiles(bonusL, [50, 90, 95, 99]),
          histogram: histogram(bonusL, [0, 0.25, 0.5, 1, 1.5, 2]),
        },
        interestTagsOverlay: {
          count: bonusI.length,
          ...percentiles(bonusI, [50, 90, 95, 99]),
          histogram: histogram(bonusI, [0, 0.25, 0.5, 1, 1.5, 2]),
        },
        sumPersonalityLifestyleInterestOnlyPerPair: {
          pairsWithAnyOfThreeBonuses: bonusSumPLI.length,
          ...percentiles(bonusSumPLI, [50, 90, 95, 99]),
          histogram: histogram(bonusSumPLI, [0, 1, 2, 3, 4, 5, 6]),
        },
      },
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(out, null, 2), 'utf8');
    console.log(JSON.stringify(out, null, 2));
    await prisma.$disconnect();
  })().catch((e) => {
    console.error(e);
    void prisma.$disconnect();
    process.exit(1);
  });
}

function sumMap(m: Map<string, number>): number {
  let t = 0;
  for (const v of m.values()) t += v;
  return t;
}

main();
