/**
 * Verify Sprint 41 Story 3 validation fixtures in local DB.
 *
 * Usage (from dating-api):
 *   npx ts-node --project tsconfig.json scripts/verify-sprint41-validation-fixtures.ts
 *   npm run verify:sprint41-validation
 */

import { PrismaClient, UserProfilePhotoStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  calculatePriorityTier,
  PRIORITY_GOOD_MIN,
  PRIORITY_HIGH_MIN,
} from '../src/me-profile/match-priority';
import {
  CANDIDATES_FOR_VIEWER_A,
  CANDIDATES_FOR_VIEWER_B,
  VIEWER_A,
  VIEWER_B,
} from './sprint41-validation-fixtures';
import { assertSprint41ValidationSafeEnvironment } from './sprint41-validation-safety';

dotenv.config();

const prisma = new PrismaClient();

type TierCounts = { HIGH: number; GOOD: number; OTHER: number };

function countTiers(scores: number[]): TierCounts {
  const out: TierCounts = { HIGH: 0, GOOD: 0, OTHER: 0 };
  for (const s of scores) {
    out[calculatePriorityTier(s)] += 1;
  }
  return out;
}

async function verifyViewer(
  label: string,
  viewerUserId: string,
  viewerProfileId: string,
  expected: typeof CANDIDATES_FOR_VIEWER_A,
): Promise<number> {
  let failures = 0;

  console.log(`\n══ ${label} ══`);
  console.log(`viewerUserId=${viewerUserId}`);
  console.log(`thresholds: HIGH>=${PRIORITY_HIGH_MIN} GOOD>=${PRIORITY_GOOD_MIN}`);

  const viewerPhotos = await prisma.userProfilePhoto.count({
    where: {
      profileId: viewerProfileId,
      status: UserProfilePhotoStatus.APPROVED,
    },
  });
  if (viewerPhotos < 1) {
    console.error('  FAIL: viewer missing APPROVED photo');
    failures += 1;
  } else {
    console.log(`  ✓ viewer APPROVED photos: ${viewerPhotos}`);
  }

  const ranks = await prisma.matchListRank.findMany({
    where: { viewerUserId, hardBlocked: false },
    orderBy: [{ matchScore: 'desc' }, { candidateProfileId: 'asc' }],
    include: {
      candidateProfile: {
        include: {
          photos: { where: { status: UserProfilePhotoStatus.APPROVED } },
        },
      },
    },
  });

  if (ranks.length !== expected.length) {
    console.error(
      `  FAIL: expected ${expected.length} ranks, got ${ranks.length}`,
    );
    failures += 1;
  } else {
    console.log(`  ✓ rank count: ${ranks.length}`);
  }

  const scores = ranks.map((r) => r.matchScore);
  const tiers = countTiers(scores);
  console.log(
    `  tiers from ranks: HIGH ${tiers.HIGH} / GOOD ${tiers.GOOD} / OTHER ${tiers.OTHER}`,
  );
  if (tiers.HIGH !== 2 || tiers.GOOD !== 4 || tiers.OTHER !== 4) {
    console.error('  FAIL: expected tier mix 2 / 4 / 4');
    failures += 1;
  } else {
    console.log('  ✓ tier mix 2 / 4 / 4');
  }

  for (const exp of expected) {
    const row = ranks.find((r) => r.candidateProfileId === exp.profileId);
    if (!row) {
      console.error(`  FAIL: missing rank for ${exp.name} (${exp.profileId})`);
      failures += 1;
      continue;
    }
    if (row.matchScore !== exp.matchScore) {
      console.error(
        `  FAIL: ${exp.name} score ${row.matchScore} !== ${exp.matchScore}`,
      );
      failures += 1;
    }
    const approved = row.candidateProfile.photos.length;
    if (approved < 1) {
      console.error(`  FAIL: ${exp.name} has no APPROVED photo`);
      failures += 1;
    } else {
      const key = row.candidateProfile.photos[0]?.storageKey;
      if (key) {
        try {
          await access(resolve(process.cwd(), key));
        } catch {
          console.error(`  FAIL: photo file missing on disk: ${key}`);
          failures += 1;
        }
      }
    }
    const tier = calculatePriorityTier(row.matchScore);
    console.log(
      `  · ${exp.name.padEnd(14)} score=${row.matchScore} tier=${tier} photos=${approved}`,
    );
  }

  return failures;
}

async function main(): Promise<void> {
  assertSprint41ValidationSafeEnvironment();
  let failures = 0;
  failures += await verifyViewer(
    'Viewer A (primary protocol)',
    VIEWER_A.userId,
    VIEWER_A.profileId,
    CANDIDATES_FOR_VIEWER_A,
  );
  failures += await verifyViewer(
    'Viewer B (optional)',
    VIEWER_B.userId,
    VIEWER_B.profileId,
    CANDIDATES_FOR_VIEWER_B,
  );

  console.log('\n── Summary ──');
  if (failures > 0) {
    console.error(`FAIL: ${failures} check(s) failed`);
    process.exitCode = 1;
  } else {
    console.log('PASS: fixtures look ready for human validation sessions');
    console.log('\nNext: set dating_session cookie to Viewer A token, open /dating/me-matches');
    console.log(`  ${VIEWER_A.rawSessionToken}`);
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
