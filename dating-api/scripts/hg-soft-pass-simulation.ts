/**
 * Read-only pool report: Holy Grail Layer 3 eligibility using **production** `evaluateHolyGrailDirectional` only.
 * Same synthetic pool as hg-validation-report.ts. No alternate matrices, no experimental AGE/RELIGION softening.
 *
 * Locked SOFT_PASS policy (HG eligibility only): canonical write-up `docs/HOLY_GRAIL_MATCHING.md` § “Locked Layer 3 policy”;
 * implementation `src/holy-grail-matching/eligibility.evaluator.ts`. Summarized in `report.policy` below.
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { HOLY_GRAIL_DIMENSION_KEYS, type HolyGrailDimensionKey } from '../src/holy-grail-matching/holy-grail-dimensions';
import { mapProfileSourceToMatchingCanonical } from '../src/holy-grail-matching/profile-to-canonical.mapper';
import { evaluateHolyGrailDirectional } from '../src/holy-grail-matching/eligibility.evaluator';
import type { HolyGrailHardEligibilityStatus } from '../src/holy-grail-matching/eligibility.evaluator';
import { buildHolyGrailProfileMappingInputFromRankingAwareDbRow } from '../src/holy-grail-matching/retrieval/holy-grail-structured-db-json';
import { CHILDREN_UNSURE_PROFILE_ROW_SELECT } from '../src/matches/match-detail-children-unsure';

const SYNTHETIC_ID_PREFIX_ALLOWLIST = ['synthetic-he-', 'synthetic-en-', 'synthetic-hg-gap-'] as const;
const VALIDATION_CANDIDATE_PREFIXES = SYNTHETIC_ID_PREFIX_ALLOWLIST;

const OUTPUT_JSON = path.join(__dirname, '.hg-soft-pass-simulation-output.json');

type StatusBucket = 'PASS' | 'FAIL' | 'SOFT_PASS' | 'SKIPPED';

function initDimCounts(): Record<HolyGrailDimensionKey, Record<StatusBucket, number>> {
  const o = {} as Record<HolyGrailDimensionKey, Record<StatusBucket, number>>;
  for (const k of HOLY_GRAIL_DIMENSION_KEYS) {
    o[k] = { PASS: 0, FAIL: 0, SOFT_PASS: 0, SKIPPED: 0 };
  }
  return o;
}

function bucket(status: HolyGrailHardEligibilityStatus): StatusBucket {
  return status;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  const evaluatedAt = new Date();
  const dimCounts = initDimCounts();

  const pairStats = {
    mutualPassPairs: 0,
    orderedPairEvaluationsConsidered: 0,
  };

  const policy = {
    scope: 'Holy Grail Layer 3 hard eligibility only (not ranking).',
    age: 'Hard PASS/FAIL/SKIPPED only — no SOFT_PASS.',
    religion: 'Hard PASS/FAIL/SKIPPED only — no SOFT_PASS.',
    alcohol: {
      matrix: 'Production PASS/FAIL matrix; WITHHELD and missing → FAIL.',
      softPass:
        'NONE_ONLY × partner RARE: SOFT_PASS only when holyGrailDeterministicHalfPass(ALCOHOL_NONE_ONLY_RARE, searcherProfileId, counterpartyProfileId) is true (~50% of ordered pairs); reason ALCOHOL_NONE_ONLY_RARE_SOFT. Otherwise FAIL.',
      excluded:
        'No SOFT_PASS for MODERATE_OK×FREQUENT, PREFER_NOT_TO_SAY, missing, or any cell other than NONE_ONLY×RARE.',
    },
    partnerWantsChildren: {
      softPass: 'MUST_WANT × partner UNSURE → SOFT_PASS; reason WANTS_CHILDREN_MUST_WANT_UNSURE_SOFT; sets children_unsure.',
      hard: 'All other combinations use hard PASS/FAIL/SKIPPED (including MUST_NOT_WANT × UNSURE → FAIL).',
    },
  };

  try {
    const searchers = await prisma.matchmakingProfile.findMany({
      where: {
        OR: SYNTHETIC_ID_PREFIX_ALLOWLIST.map((prefix) => ({ id: { startsWith: prefix } })),
      },
      orderBy: [{ id: 'asc' }],
      take: 5,
      select: { id: true },
    });

    for (const { id: searcherId } of searchers) {
      const sRow = await prisma.matchmakingProfile.findUnique({
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

      const candidateRows = await prisma.matchmakingProfile.findMany({
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

        pairStats.orderedPairEvaluationsConsidered += 1;
        const stc = evaluateHolyGrailDirectional({ searcher: sCanon, counterparty: cCanon, evaluatedAt });
        const cts = evaluateHolyGrailDirectional({ searcher: cCanon, counterparty: sCanon, evaluatedAt });

        if (stc.overallHardEligibility === 'PASS' && cts.overallHardEligibility === 'PASS') {
          pairStats.mutualPassPairs += 1;
        }

        for (const dir of [stc, cts]) {
          for (const dim of HOLY_GRAIL_DIMENSION_KEYS) {
            const st = dir.dimensions[dim].status;
            dimCounts[dim][bucket(st)] += 1;
          }
        }
      }
    }

    const totalDirected = searchers.length > 0 ? pairStats.orderedPairEvaluationsConsidered * 2 : 0;

    const perDimension = Object.fromEntries(
      HOLY_GRAIL_DIMENSION_KEYS.map((dim) => {
        const c = dimCounts[dim];
        const active = c.PASS + c.FAIL + c.SOFT_PASS;
        const failDirected = c.FAIL;
        const softDirected = c.SOFT_PASS;
        const pctFailToSoftPass =
          failDirected + softDirected > 0
            ? Math.round((1000 * softDirected) / (failDirected + softDirected)) / 10
            : null;
        return [
          dim,
          {
            PASS: c.PASS,
            FAIL: c.FAIL,
            SOFT_PASS: c.SOFT_PASS,
            SKIPPED: c.SKIPPED,
            totalDirected: c.PASS + c.FAIL + c.SOFT_PASS + c.SKIPPED,
            activeDirected: active,
            /** Among directed evals where status is FAIL or SOFT_PASS, % that are SOFT_PASS (SOFT_PASS dimensions only). */
            pctFailOrSoftThatAreSoftPass: pctFailToSoftPass,
          },
        ];
      }),
    ) as Record<string, unknown>;

    const report = {
      meta: {
        pool: 'same as hg-validation-report',
        searchers: searchers.map((s) => s.id),
        evaluatedAtIso: evaluatedAt.toISOString(),
        totalDirectedPairEvaluations: totalDirected,
      },
      policy,
      pairStats,
      perDimension,
      versusPermissiveExperimentSummary: {
        note: 'Earlier experiments used simulated AGE buffer, RELIGION SOFT_PASS, 100% ALCOHOL matrix softening, and/or MUST_NOT×UNSURE softening — all removed from production and from this script.',
        alcoholVersusUltraPermissive:
          'Ultra treated every NONE_ONLY×RARE matrix FAIL as SOFT_PASS (~100% of those fails). Locked policy uses deterministic partial softening (~50% of ordered searcher→counterparty pairs).',
        partnerWantsChildrenVersusUltraPermissive:
          'Ultra softened all hard fails on this dimension. Locked policy: only MUST_WANT×UNSURE is SOFT_PASS; MUST_NOT×UNSURE remains FAIL.',
      },
    };

    fs.writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), 'utf8');

    console.log('# HG eligibility pool report (production evaluator)\n');
    console.log(JSON.stringify(policy, null, 2));
    console.log('\n## Pair stats\n', pairStats);
    console.log('\n## ALCOHOL / PARTNER_WANTS_CHILDREN (directed)\n');
    for (const dim of ['ALCOHOL', 'PARTNER_WANTS_CHILDREN'] as const) {
      const row = perDimension[dim] as {
        PASS: number;
        FAIL: number;
        SOFT_PASS: number;
        SKIPPED: number;
        pctFailOrSoftThatAreSoftPass: number | null;
      };
      console.log(
        `${dim}: PASS=${row.PASS} FAIL=${row.FAIL} SOFT_PASS=${row.SOFT_PASS} SKIPPED=${row.SKIPPED} | pct(FAIL|SOFT → SOFT)=${row.pctFailOrSoftThatAreSoftPass ?? 'n/a'}%`,
      );
    }
    console.log(`\nFull JSON: ${OUTPUT_JSON}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('hg-soft-pass-simulation failed:', err);
  process.exit(1);
});
