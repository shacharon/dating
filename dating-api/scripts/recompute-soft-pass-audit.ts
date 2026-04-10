/**
 * One-off audit after SOFT_PASS (children UNSURE) rollout:
 * 1) Recompute match engine index (same as POST /api/v1/matches/rebuild).
 * 2) Holy Grail validation pool: mutual-pass pairs now vs strict baseline (no SOFT_PASS on children or alcohol).
 * 3) Among engine matches, count & sample pairs with children_unsure flags.
 *
 * Policy reference: `docs/HOLY_GRAIL_MATCHING.md` § “Locked Layer 3 policy” (MUST_WANT×UNSURE SOFT_PASS; NONE_ONLY×RARE partial SOFT_PASS; etc.).
 *
 * Run: npx ts-node scripts/recompute-soft-pass-audit.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MatchesService } from '../src/matches/matches.service';
import { MatchDaemonService } from '../src/matches/match-daemon.service';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  computeMatchDetailChildrenUnsureFromRows,
  type ChildrenUnsureProfileRow,
} from '../src/matches/match-detail-children-unsure';
import { evaluateHolyGrailDirectional } from '../src/holy-grail-matching/eligibility.evaluator';
import type { HolyGrailDirectionalEvaluationResult } from '../src/holy-grail-matching/eligibility.evaluator';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../src/matches/match-detail-children-unsure';
const OUTPUT_JSON = path.join(__dirname, '.recompute-soft-pass-audit-output.json');

const SYNTHETIC_ID_PREFIX_ALLOWLIST = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;
const VALIDATION_CANDIDATE_PREFIXES = SYNTHETIC_ID_PREFIX_ALLOWLIST;

function strictBaselineDirectionOk(e: HolyGrailDirectionalEvaluationResult): boolean {
  if (e.overallHardEligibility !== 'PASS') return false;
  if (e.dimensions.PARTNER_WANTS_CHILDREN.status === 'SOFT_PASS') return false;
  if (e.dimensions.ALCOHOL.status === 'SOFT_PASS') return false;
  return true;
}

interface HgPairSample {
  searcherId: string;
  candidateId: string;
  childrenUnsureStc: boolean;
  childrenUnsureCts: boolean;
}

async function hgValidationPoolAudit(prisma: PrismaService): Promise<{
  mutualPassCurrent: number;
  mutualPassBaselineStrict: number;
  newlyAdmittedHgPairs: number;
  orderedPairEvaluations: number;
  newlyAdmittedSamples: HgPairSample[];
}> {
  const searchers = await prisma.userProfile.findMany({
    where: {
      OR: SYNTHETIC_ID_PREFIX_ALLOWLIST.map((prefix) => ({ id: { startsWith: prefix } })),
    },
    orderBy: [{ id: 'asc' }],
    take: 5,
    select: { id: true },
  });

  let mutualPassCurrent = 0;
  let mutualPassBaselineStrict = 0;
  let orderedPairEvaluations = 0;
  const newlyAdmittedSamples: HgPairSample[] = [];

  for (const { id: searcherId } of searchers) {
    const sRow = await prisma.userProfile.findUnique({
      where: { id: searcherId },
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
    });
    if (!sRow) continue;
    let sCanon;
    try {
      sCanon = mapProfileSourceToMatchingCanonical(buildHolyGrailProfileMappingInputFromRankingAwareDbRow(sRow));
    } catch {
      continue;
    }

    const candidateRows = await prisma.userProfile.findMany({
      where: {
        id: { not: searcherId },
        OR: VALIDATION_CANDIDATE_PREFIXES.map((prefix) => ({ id: { startsWith: prefix } })),
      },
      orderBy: [{ id: 'asc' }],
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
    });

    for (const cRow of candidateRows) {
      let cCanon;
      try {
        cCanon = mapProfileSourceToMatchingCanonical(buildHolyGrailProfileMappingInputFromRankingAwareDbRow(cRow));
      } catch {
        continue;
      }
      orderedPairEvaluations += 1;
      const evaluatedAt = new Date();
      const stc = evaluateHolyGrailDirectional({ searcher: sCanon, counterparty: cCanon, evaluatedAt });
      const cts = evaluateHolyGrailDirectional({ searcher: cCanon, counterparty: sCanon, evaluatedAt });

      const cur =
        stc.overallHardEligibility === 'PASS' && cts.overallHardEligibility === 'PASS';
      const base = strictBaselineDirectionOk(stc) && strictBaselineDirectionOk(cts);
      if (cur) mutualPassCurrent += 1;
      if (base) mutualPassBaselineStrict += 1;
      if (cur && !base && newlyAdmittedSamples.length < 25) {
        newlyAdmittedSamples.push({
          searcherId,
          candidateId: cRow.id,
          childrenUnsureStc: stc.eligibilityFlags.children_unsure,
          childrenUnsureCts: cts.eligibilityFlags.children_unsure,
        });
      }
    }
  }

  return {
    mutualPassCurrent,
    mutualPassBaselineStrict,
    newlyAdmittedHgPairs: mutualPassCurrent - mutualPassBaselineStrict,
    orderedPairEvaluations,
    newlyAdmittedSamples,
  };
}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  try {
    const matchesService = app.get(MatchesService);
    const daemon = app.get(MatchDaemonService);
    const prisma = app.get(PrismaService);

    console.log('Computing all pairwise matches (single pass)…');
    const records = await matchesService.listAllComputed();
    const rebuildStats = daemon.refreshIndexFromRecords(records);

    console.log('Loading profiles for children_unsure scan…');
    const profileRows = await prisma.userProfile.findMany({
      select: CHILDREN_UNSURE_PROFILE_ROW_SELECT,
    });
    const byId = new Map<string, ChildrenUnsureProfileRow>(
      profileRows.map((p) => [p.id, p as ChildrenUnsureProfileRow]),
    );

    type SampleRow = {
      matchId: string;
      finalScore: number;
      a: { id: string; name: string };
      b: { id: string; name: string };
      children_unsure: {
        profile_a_to_profile_b: boolean;
        profile_b_to_profile_a: boolean;
      };
    };

    const withFlags: SampleRow[] = [];
    for (const r of records) {
      const rowA = byId.get(r.aId);
      const rowB = byId.get(r.bId);
      if (!rowA || !rowB) continue;
      const cu = computeMatchDetailChildrenUnsureFromRows(rowA, rowB);
      if (cu.profile_a_to_profile_b || cu.profile_b_to_profile_a) {
        withFlags.push({
          matchId: r.matchId,
          finalScore: r.finalScore ?? r.overall,
          a: r.a,
          b: r.b,
          children_unsure: cu,
        });
      }
    }

    withFlags.sort((x, y) => y.finalScore - x.finalScore);
    const top20 = withFlags.slice(0, 20);

    const hg = await hgValidationPoolAudit(prisma);
    const top20HgNewlyAdmitted = hg.newlyAdmittedSamples.slice(0, 20);

    const report = {
      meta: {
        generatedAtIso: new Date().toISOString(),
        poolNote:
          'HG counts: first 5 synthetic searchers × all other synthetic candidates (same slice as hg-validation-report). Engine matches: all DB profiles that compare READY.',
      },
      matchEngine: {
        profileCount: rebuildStats.profileCount,
        matchCountAfterRebuild: rebuildStats.matchCount,
        matchRecordsLength: records.length,
      },
      holyGrailValidationPool: {
        orderedSearcherCandidatePairs: hg.orderedPairEvaluations,
        mutualPassPairsCurrent: hg.mutualPassCurrent,
        mutualPassPairsBaselineStrictChildren: hg.mutualPassBaselineStrict,
        newlyAdmittedPairsVsBaseline: hg.newlyAdmittedHgPairs,
        top20NewlyAdmittedVsStrictBaseline: top20HgNewlyAdmitted,
      },
      childrenUnsureAmongEngineMatches: {
        engineMatchCount: records.length,
        matchesWithAnyChildrenUnsure: withFlags.length,
      },
      top20SampleMatchesChildrenUnsure: top20,
      note:
        'Engine match count is unchanged by SOFT_PASS (scoring does not use HG). Baseline strict = mutual HG pass if PARTNER_WANTS_CHILDREN SOFT_PASS were treated as blocking.',
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');

    console.log('=== RECOMPUTE + SOFT_PASS AUDIT ===\n');
    console.log('Match engine (rebuild)');
    console.log(`  profileCount: ${report.matchEngine.profileCount}`);
    console.log(`  matchCountAfterRebuild: ${report.matchEngine.matchCountAfterRebuild}`);
    console.log(`  listAllComputed.length: ${report.matchEngine.matchRecordsLength}`);
    console.log('\nHoly Grail validation pool (mutual hard eligibility)');
    console.log(`  ordered pairs evaluated: ${report.holyGrailValidationPool.orderedSearcherCandidatePairs}`);
    console.log(`  mutual PASS (current, SOFT_PASS allowed): ${report.holyGrailValidationPool.mutualPassPairsCurrent}`);
    console.log(
      `  mutual PASS (baseline strict, no children SOFT_PASS): ${report.holyGrailValidationPool.mutualPassPairsBaselineStrictChildren}`,
    );
    console.log(`  new vs baseline (current − strict): ${report.holyGrailValidationPool.newlyAdmittedPairsVsBaseline}`);
    console.log('\nchildren_unsure among engine matches');
    console.log(`  engine matches: ${report.childrenUnsureAmongEngineMatches.engineMatchCount}`);
    console.log(`  with any children_unsure direction: ${report.childrenUnsureAmongEngineMatches.matchesWithAnyChildrenUnsure}`);
    console.log(`\nTop ${top20.length} engine matches (by score) with children_unsure:`);
    for (const row of top20) {
      console.log(
        `  ${row.matchId} score=${row.finalScore} ${row.a.name}|${row.b.name} a→b=${row.children_unsure.profile_a_to_profile_b} b→a=${row.children_unsure.profile_b_to_profile_a}`,
      );
    }
    console.log(`\nTop ${top20HgNewlyAdmitted.length} HG validation pairs (new vs strict baseline):`);
    for (const row of top20HgNewlyAdmitted) {
      console.log(
        `  ${row.searcherId} × ${row.candidateId} childrenUnsureStc=${row.childrenUnsureStc} childrenUnsureCts=${row.childrenUnsureCts}`,
      );
    }
    console.log(`\nJSON: ${OUTPUT_JSON}`);
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error('recompute-soft-pass-audit failed:', err);
  process.exit(1);
});
