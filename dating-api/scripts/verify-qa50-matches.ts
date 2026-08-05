/**
 * Verify MatchListRank coverage for qa50 viewers.
 *
 * Usage:
 *   npm run verify:qa50-matches
 *   npm run verify:qa50-matches -- --assert-demo
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { calculatePriorityTier } from '../src/me-profile/match-priority';
import { QA50_PROFILE_IDS, QA50_VIEWERS } from './qa50-fixtures';
import { assertQa50SafeEnvironment } from './qa50-seed-safety';

dotenv.config();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  assertQa50SafeEnvironment();
  const assertDemo = process.argv.includes('--assert-demo');
  let failures = 0;

  console.log('\n══ QA50 match ranks verify ══');

  const s41Ranks = await prisma.matchListRank.count({
    where: { viewerUserId: { startsWith: 's41val_' } },
  });
  console.log(`  s41val viewer ranks present: ${s41Ranks} (untouched check)`);

  for (const v of QA50_VIEWERS) {
    const ranks = await prisma.matchListRank.findMany({
      where: { viewerUserId: v.userId, hardBlocked: false },
      orderBy: [{ matchScore: 'desc' }, { candidateProfileId: 'asc' }],
    });

    const badCand = ranks.filter(
      (r) => !QA50_PROFILE_IDS.includes(r.candidateProfileId),
    );
    if (badCand.length) {
      console.error(
        `FAIL: ${v.key} has ${badCand.length} non-qa50 candidates`,
      );
      failures += 1;
    }

    const selfHit = ranks.some((r) => r.candidateProfileId === v.profileId);
    if (selfHit) {
      console.error(`FAIL: ${v.key} ranked against self`);
      failures += 1;
    }

    if (!v.userId.startsWith('qa50_')) {
      console.error(`FAIL: viewer userId not qa50_*: ${v.userId}`);
      failures += 1;
    }

    const tiers = { HIGH: 0, GOOD: 0, OTHER: 0 };
    for (const r of ranks) {
      tiers[calculatePriorityTier(r.matchScore)] += 1;
    }
    const tierCount = [tiers.HIGH, tiers.GOOD, tiers.OTHER].filter(
      (n) => n > 0,
    ).length;

    console.log(
      `  ${v.key}: ${ranks.length} ranks  HIGH=${tiers.HIGH} GOOD=${tiers.GOOD} OTHER=${tiers.OTHER}`,
    );

    if (assertDemo) {
      if (ranks.length < 15) {
        console.error(`FAIL: ${v.key} expected ≥15 ranks, got ${ranks.length}`);
        failures += 1;
      }
      if (tierCount < 2) {
        console.error(`FAIL: ${v.key} expected ≥2 tiers, got ${tierCount}`);
        failures += 1;
      }
    }
  }

  console.log('\n── Summary ──');
  if (failures > 0) {
    console.error(`FAIL: ${failures} check(s)`);
    process.exitCode = 1;
  } else if (assertDemo) {
    console.log('PASS: demo AC (≥15 ranks, ≥2 tiers per viewer)');
  } else {
    console.log('PASS: histograms printed (add --assert-demo for AC gates)');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
