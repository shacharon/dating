/**
 * Verify qa50 MatchListRank rows for one real local viewer (Story 4).
 *
 * Usage:
 *   npm run verify:qa50-real -- --email=you@example.com
 *   npm run verify:qa50-real -- --email=you@example.com --assert-demo
 */

import { PrismaClient, UserProfileStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import { calculatePriorityTier } from '../src/me-profile/match-priority';
import { QA50_PREFIX, QA50_PROFILE_IDS } from './qa50-fixtures';
import { assertQa50SafeEnvironment } from './qa50-seed-safety';

dotenv.config();

const prisma = new PrismaClient();

function argValue(argv: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const hit = argv.find((a) => a.startsWith(prefix));
  if (hit) return hit.slice(prefix.length).trim() || undefined;
  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1]!.startsWith('--')) {
    return argv[idx + 1]!.trim();
  }
  return undefined;
}

async function main(): Promise<void> {
  assertQa50SafeEnvironment();
  const assertDemo = process.argv.includes('--assert-demo');
  let failures = 0;

  const email =
    argValue(process.argv, '--email') ??
    process.env.QA50_REAL_VIEWER_EMAIL?.trim();
  const userIdFlag = argValue(process.argv, '--userId');
  if (!email && !userIdFlag) {
    throw new Error('Required: --email=… or QA50_REAL_VIEWER_EMAIL or --userId=…');
  }

  const user = userIdFlag
    ? await prisma.user.findUnique({ where: { id: userIdFlag } })
    : await prisma.user.findUnique({ where: { email: email! } });
  if (!user) {
    throw new Error('User not found');
  }
  if (user.id.startsWith('qa50_') || user.id.startsWith('s41val_')) {
    throw new Error(`Refusing fixture userId=${user.id}`);
  }

  const profile = await prisma.userProfile.findFirst({
    where: { userId: user.id },
  });
  if (!profile || profile.status !== UserProfileStatus.ANALYZED) {
    console.error('FAIL: viewer profile missing or not ANALYZED');
    process.exitCode = 1;
    return;
  }

  console.log('\n══ QA50 real-viewer ranks verify ══');
  console.log(`  email=${user.email} userId=${user.id}`);

  const allRanks = await prisma.matchListRank.findMany({
    where: { viewerUserId: user.id, hardBlocked: false },
  });
  const qa50Ranks = allRanks.filter((r) =>
    r.candidateProfileId.startsWith(QA50_PREFIX),
  );
  const nonQa50 = allRanks.filter(
    (r) => !r.candidateProfileId.startsWith(QA50_PREFIX),
  );

  const badCand = qa50Ranks.filter(
    (r) => !QA50_PROFILE_IDS.includes(r.candidateProfileId),
  );
  if (badCand.length) {
    console.error(`FAIL: ${badCand.length} qa50-prefix ranks not in catalog`);
    failures += 1;
  }

  const selfHit = qa50Ranks.some((r) => r.candidateProfileId === profile.id);
  if (selfHit) {
    console.error('FAIL: ranked against own profile');
    failures += 1;
  }

  const tiers = { HIGH: 0, GOOD: 0, OTHER: 0 };
  for (const r of qa50Ranks) {
    tiers[calculatePriorityTier(r.matchScore)] += 1;
  }
  const tierCount = [tiers.HIGH, tiers.GOOD, tiers.OTHER].filter(
    (n) => n > 0,
  ).length;

  console.log(
    `  qa50 ranks: ${qa50Ranks.length}  HIGH=${tiers.HIGH} GOOD=${tiers.GOOD} OTHER=${tiers.OTHER}`,
  );
  console.log(`  non-qa50 ranks (preserved): ${nonQa50.length}`);

  if (assertDemo) {
    if (qa50Ranks.length < 5) {
      console.error(
        `FAIL: expected ≥5 qa50 ranks, got ${qa50Ranks.length}`,
      );
      failures += 1;
    }
    if (tierCount < 2) {
      console.error(`FAIL: expected ≥2 tiers, got ${tierCount}`);
      failures += 1;
    }
  }

  console.log('\n── Summary ──');
  if (failures > 0) {
    console.error(`FAIL: ${failures} check(s)`);
    process.exitCode = 1;
  } else if (assertDemo) {
    console.log('PASS: real viewer demo AC (≥5 qa50 ranks, ≥2 tiers)');
  } else {
    console.log('PASS: histogram printed (add --assert-demo for AC gates)');
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
