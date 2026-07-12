import 'dotenv/config';

/**
 * Validates lifestyleSignals v2 after seed-lifestyle-v2-validation:
 * extraction → canonical → ranking; coverage, canonical tags, grounded notes, eligibility invariance, rank stability.
 *
 * Prerequisites: DATABASE_URL + npx ts-node scripts/seed-lifestyle-v2-validation.ts
 *
 * Run: npx ts-node scripts/validate-lifestyle-signals-v2.ts
 *      npm run validate:lifestyle-v2
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import type { MatchingCanonicalModel } from '../../../src/canonical/matching-canonical.types';
import type { HolyGrailDirectionalEvaluationResult } from '../../../src/holy-grail-matching/eligibility.evaluator';
import { evaluateHolyGrailDirectional } from '../../../src/holy-grail-matching/eligibility.evaluator';
import { rankHolyGrailCandidatesAfterHardFilter } from '../../../src/holy-grail-matching/holy-grail-candidate-ranking';
import { LIFESTYLE_SIGNAL_TAG_SET } from '../../../src/holy-grail-matching/lifestyle-signals-text.extract';
import { mapProfileSourceToMatchingCanonical } from '../../../src/holy-grail-matching/profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../../../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../../../src/matches/match-detail-children-unsure';
import type { ChildrenUnsureProfileRow } from '../../../src/matches/children-unsure-profile-row.types';

const PREFIX = 'synthetic-ls-v2-';
const MIN_COVERAGE_PCT = 70;
const OUTPUT_JSON = path.join(__dirname, '.lifestyle-v2-validation-output.json');

function stripLifestyleRankingSignals(m: MatchingCanonicalModel): MatchingCanonicalModel {
  const rs = m.rankingSignals;
  if (!rs) return m;
  const next = { ...rs };
  delete (next as { lifestyleSignalsSelf?: unknown }).lifestyleSignalsSelf;
  delete (next as { lifestyleSignalsPartner?: unknown }).lifestyleSignalsPartner;
  return { ...m, rankingSignals: next };
}

function allLifestyleTags(m: MatchingCanonicalModel): string[] {
  const rs = m.rankingSignals;
  if (!rs) return [];
  return [...(rs.lifestyleSignalsSelf ?? []), ...(rs.lifestyleSignalsPartner ?? [])];
}

function assertCanonicalTags(tags: readonly string[], profileId: string): void {
  for (const t of tags) {
    if (!LIFESTYLE_SIGNAL_TAG_SET.has(t)) {
      throw new Error(`Non-canonical lifestyle tag on ${profileId}: ${JSON.stringify(t)}`);
    }
  }
}

function eligibilityKey(r: HolyGrailDirectionalEvaluationResult): string {
  const dims = Object.fromEntries(
    Object.entries(r.dimensions).map(([k, v]) => [k, `${v.status}:${v.reasonCode}`]),
  );
  return JSON.stringify({ overall: r.overallHardEligibility, dims, flags: r.eligibilityFlags });
}

function groundedLifestyleTagSet(s: MatchingCanonicalModel, c: MatchingCanonicalModel): Set<string> {
  const rs = s.rankingSignals;
  const rc = c.rankingSignals;
  const sSelf = rs?.lifestyleSignalsSelf ?? [];
  const sPartner = rs?.lifestyleSignalsPartner ?? [];
  const cSelf = rc?.lifestyleSignalsSelf ?? [];
  const cPartner = rc?.lifestyleSignalsPartner ?? [];
  const inter1 = sPartner.filter((t) => cSelf.includes(t));
  const inter2 = sSelf.filter((t) => cPartner.includes(t));
  return new Set([...inter1, ...inter2]);
}

function parseGroundedLifestyleTags(note: string): string[] {
  const m = note.match(/^lifestyleSignals:grounded\(([^,)]+),O=/);
  if (!m?.[1]) return [];
  return m[1]
    .split(';')
    .map((x) => x.trim())
    .filter(Boolean);
}

function kendallTauNormalized(idsA: string[], idsB: string[]): number | null {
  const common = idsA.filter((x) => idsB.includes(x));
  if (common.length < 2) return null;
  const rankB = new Map(common.map((id, i) => [id, idsB.indexOf(id)]));
  let inv = 0;
  for (let i = 0; i < common.length; i++) {
    for (let j = i + 1; j < common.length; j++) {
      const a = common[i]!;
      const b = common[j]!;
      const oa = idsA.indexOf(a) - idsA.indexOf(b);
      const ob = (rankB.get(a) ?? 0) - (rankB.get(b) ?? 0);
      if (Math.sign(oa) !== Math.sign(ob)) inv += 1;
    }
  }
  const n = common.length;
  const maxInv = (n * (n - 1)) / 2;
  return maxInv > 0 ? 1 - inv / maxInv : 1;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const evaluatedAt = new Date();

  try {
    const rows = await prisma.matchmakingProfile.findMany({
      where: { id: { startsWith: PREFIX } },
      orderBy: { id: 'asc' },
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
    });

    if (rows.length < 20) {
      throw new Error(
        `Expected ≥20 profiles with id prefix ${PREFIX} (got ${rows.length}). Run: npx ts-node scripts/seed-lifestyle-v2-validation.ts`,
      );
    }

    const canonById = new Map<string, MatchingCanonicalModel>();
    for (const row of rows) {
      const input = buildHolyGrailProfileMappingInputFromRankingAwareDbRow(row as ChildrenUnsureProfileRow);
      const m = mapProfileSourceToMatchingCanonical(input);
      canonById.set(row.id, m);
      const tags = allLifestyleTags(m);
      assertCanonicalTags(tags, row.id);
    }

    const withTags = [...canonById.values()].filter((m) => allLifestyleTags(m).length > 0).length;
    const coveragePct = Math.round((1e4 * withTags) / canonById.size) / 100;

    if (coveragePct < MIN_COVERAGE_PCT) {
      throw new Error(
        `Lifestyle coverage ${coveragePct}% < ${MIN_COVERAGE_PCT}% (with ≥1 tag: ${withTags}/${canonById.size})`,
      );
    }

    const searcherId = rows[0]!.id;
    const searcher = canonById.get(searcherId)!;
    const candidates = rows
      .filter((r) => r.id !== searcherId)
      .map((r) => canonById.get(r.id)!);

    for (const c of candidates) {
      const stc = evaluateHolyGrailDirectional({ searcher, counterparty: c, evaluatedAt });
      const cts = evaluateHolyGrailDirectional({ searcher: c, counterparty: searcher, evaluatedAt });
      const stcB = evaluateHolyGrailDirectional({
        searcher: stripLifestyleRankingSignals(searcher),
        counterparty: stripLifestyleRankingSignals(c),
        evaluatedAt,
      });
      const ctsB = evaluateHolyGrailDirectional({
        searcher: stripLifestyleRankingSignals(c),
        counterparty: stripLifestyleRankingSignals(searcher),
        evaluatedAt,
      });
      if (eligibilityKey(stc) !== eligibilityKey(stcB) || eligibilityKey(cts) !== eligibilityKey(ctsB)) {
        throw new Error(
          `Eligibility mismatch vs lifestyle-stripped baseline for pair ${searcherId} ↔ ${c.profileId}`,
        );
      }
    }

    const rankedFull = rankHolyGrailCandidatesAfterHardFilter({
      searcher,
      candidates,
      evaluatedAt,
      includeDebug: true,
    });

    if (rankedFull.rankedCandidates.length < 5) {
      throw new Error(
        `Expected ≥5 ranked survivors (got ${rankedFull.rankedCandidates.length}); check HG fixtures / eligibility.`,
      );
    }

    const rankedStrip = rankHolyGrailCandidatesAfterHardFilter({
      searcher: stripLifestyleRankingSignals(searcher),
      candidates: candidates.map(stripLifestyleRankingSignals),
      evaluatedAt,
      includeDebug: true,
    });

    const topFull = rankedFull.rankedCandidates.slice(0, 20).map((r) => r.candidate.profileId);
    const topStrip = rankedStrip.rankedCandidates.slice(0, 20).map((r) => r.candidate.profileId);

    const leftTop20 = topFull.filter((id) => !topStrip.includes(id)).length;
    const enteredTop20 = topStrip.filter((id) => !topFull.includes(id)).length;
    if (leftTop20 > 4 || enteredTop20 > 4) {
      throw new Error(
        `Top-20 churn too large: left=${leftTop20}, entered=${enteredTop20} (threshold 4 each).`,
      );
    }

    const tau = kendallTauNormalized(topFull, topStrip);
    if (tau != null && tau < 0.72) {
      throw new Error(`Top-20 Kendall tau ${tau.toFixed(4)} < 0.72 (rank instability vs lifestyle strip).`);
    }

    let maxPosMove = 0;
    const posStrip = new Map(topStrip.map((id, i) => [id, i]));
    for (let i = 0; i < topFull.length; i++) {
      const id = topFull[i]!;
      const j = posStrip.get(id);
      if (j !== undefined) maxPosMove = Math.max(maxPosMove, Math.abs(i - j));
    }
    if (maxPosMove > 8) {
      throw new Error(`Max position move within top-20 intersection: ${maxPosMove} > 8`);
    }

    for (const row of rankedFull.rankedCandidates) {
      const lsRow = row.rankBreakdown.find((b) => b.signal === 'lifestyleSignals');
      if (!lsRow) continue;
      const reasonLine = row.rankReasons.find((x) => x.startsWith('lifestyleSignals:'));
      if (!reasonLine?.includes('lifestyleSignals:grounded(')) {
        throw new Error(
          `Expected rankReasons lifestyle line with lifestyleSignals:grounded( for ${row.candidate.profileId}`,
        );
      }
      const g = groundedLifestyleTagSet(searcher, row.candidate);
      const parsed = parseGroundedLifestyleTags(lsRow.note);
      if (g.size === 0) {
        throw new Error(
          `lifestyleSignals breakdown but empty intersection ${searcherId} vs ${row.candidate.profileId}: ${lsRow.note}`,
        );
      }
      for (const t of parsed) {
        if (!g.has(t)) {
          throw new Error(
            `Grounded note lists tag not in intersection: ${t} note=${lsRow.note} grounded=${[...g].join(';')}`,
          );
        }
      }
    }

    const sampleProfiles = [...canonById.entries()]
      .filter(([, m]) => allLifestyleTags(m).length > 0)
      .slice(0, 10)
      .map(([id, m]) => {
        const rs = m.rankingSignals;
        return {
          profileId: id,
          lifestyleSignalsSelf: rs?.lifestyleSignalsSelf ?? [],
          lifestyleSignalsPartner: rs?.lifestyleSignalsPartner ?? [],
        };
      });

    const groundedSamples: { pair: string; rankReasonLine: string; note: string }[] = [];
    for (const row of rankedFull.rankedCandidates.slice(0, 15)) {
      const line = row.rankReasons.find((x) => x.startsWith('lifestyleSignals:'));
      const br = row.rankBreakdown.find((b) => b.signal === 'lifestyleSignals');
      if (line && br) {
        groundedSamples.push({
          pair: `${searcherId} vs ${row.candidate.profileId}`,
          rankReasonLine: line,
          note: br.note,
        });
      }
      if (groundedSamples.length >= 5) break;
    }

    const report = {
      profileCount: canonById.size,
      coveragePct,
      withLifestyleTagCount: withTags,
      eligibilityInvariantPairsChecked: candidates.length * 2,
      rankStability: {
        searcherId,
        top20Before: topStrip,
        top20After: topFull,
        kendallTauTop20: tau,
        maxPositionMoveTop20Intersection: maxPosMove,
        top20Left: leftTop20,
        top20Entered: enteredTop20,
      },
      sampleProfiles,
      lifestyleGroundedSamples: groundedSamples,
    };

    fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(report, null, 2));
    // eslint-disable-next-line no-console
    console.error(`\nOK — wrote ${OUTPUT_JSON}`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
