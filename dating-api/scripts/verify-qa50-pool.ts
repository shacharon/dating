/**
 * Verify Sprint QA `qa50_*` pool fixtures.
 *
 * Usage: npm run verify:qa50
 */

import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  PrismaClient,
  ProfileGender,
  UserProfilePhotoStatus,
  UserProfileStatus,
} from '@prisma/client';
import * as dotenv from 'dotenv';
import {
  QA50_CITIES,
  QA50_INTEREST_CODES,
  QA50_PROFILE_IDS,
  QA50_PROFILES,
  QA50_VIEWERS,
} from './qa50-fixtures';
import { assertQa50SafeEnvironment } from './qa50-seed-safety';

dotenv.config();

const prisma = new PrismaClient();

async function main(): Promise<void> {
  assertQa50SafeEnvironment();
  let failures = 0;

  console.log('\n══ QA50 pool verify ══');

  if (QA50_PROFILES.length !== 50) {
    console.error(`FAIL: catalog size ${QA50_PROFILES.length} !== 50`);
    failures += 1;
  } else {
    console.log('✓ catalog size 50');
  }

  const profiles = await prisma.userProfile.findMany({
    where: { id: { in: [...QA50_PROFILE_IDS] } },
    include: {
      photos: { where: { status: UserProfilePhotoStatus.APPROVED } },
      interests: true,
    },
  });

  if (profiles.length !== 50) {
    console.error(`FAIL: DB profiles ${profiles.length} !== 50`);
    failures += 1;
  } else {
    console.log('✓ DB profiles 50');
  }

  const males = profiles.filter((p) => p.gender === ProfileGender.MALE).length;
  const females = profiles.filter(
    (p) => p.gender === ProfileGender.FEMALE,
  ).length;
  console.log(`  gender M/F = ${males}/${females}`);
  if (males !== 25 || females !== 25) {
    console.error('FAIL: expected 25/25 gender split');
    failures += 1;
  } else {
    console.log('✓ gender 25/25');
  }

  const analyzed = profiles.filter(
    (p) => p.status === UserProfileStatus.ANALYZED,
  ).length;
  if (analyzed !== profiles.length) {
    console.error(`FAIL: analyzed ${analyzed}/${profiles.length}`);
    failures += 1;
  } else {
    console.log('✓ all ANALYZED');
  }

  const cities = new Set(profiles.map((p) => p.city).filter(Boolean));
  console.log(`  cities used (${cities.size}): ${[...cities].join(', ')}`);
  if (cities.size < 6) {
    console.error('FAIL: expected ≥6 cities');
    failures += 1;
  } else {
    console.log('✓ cities ≥6');
  }
  for (const c of QA50_CITIES) {
    if (!cities.has(c)) console.log(`  note: city missing ${c}`);
  }

  const interestTags = new Set<string>();
  for (const p of profiles) {
    for (const t of p.interestsTop ?? []) interestTags.add(t);
    for (const row of p.interests) interestTags.add(row.tag);
  }
  const missingInterests = QA50_INTEREST_CODES.filter(
    (c) => !interestTags.has(c),
  );
  if (missingInterests.length) {
    console.error(`FAIL: missing interests: ${missingInterests.join(', ')}`);
    failures += 1;
  } else {
    console.log(`✓ all ${QA50_INTEREST_CODES.length} interest codes present`);
  }

  for (const p of profiles) {
    const topLen = (p.interestsTop ?? []).length;
    const rowLen = p.interests.length;
    const distinct = new Set([
      ...(p.interestsTop ?? []),
      ...p.interests.map((r) => r.tag),
    ]).size;
    if (topLen !== 3 || rowLen !== 3 || distinct !== 3) {
      console.error(
        `FAIL: ${p.id} interestsTop=${topLen} rows=${rowLen} distinct=${distinct} (want 3)`,
      );
      failures += 1;
    }
  }
  console.log('✓ 3 interests per profile');

  for (const p of profiles) {
    if (p.photos.length < 1) {
      console.error(`FAIL: no APPROVED photo ${p.id}`);
      failures += 1;
      continue;
    }
    const key = p.photos[0]?.storageKey;
    if (key) {
      try {
        await access(resolve(process.cwd(), key));
      } catch {
        console.error(`FAIL: photo file missing ${key}`);
        failures += 1;
      }
    }
  }
  console.log('✓ photo gate checked');

  for (const v of QA50_VIEWERS) {
    const sess = await prisma.userSession.findUnique({
      where: { id: v.sessionId! },
    });
    if (!sess || sess.revokedAt) {
      console.error(`FAIL: missing session for ${v.key}`);
      failures += 1;
    } else {
      console.log(`✓ session ${v.key}`);
    }
  }

  console.log('\n── Summary ──');
  if (failures > 0) {
    console.error(`FAIL: ${failures} check(s)`);
    process.exitCode = 1;
  } else {
    console.log('PASS: qa50 pool ready (Story 1)');
    console.log('Viewer cookies:');
    for (const v of QA50_VIEWERS) {
      console.log(`  ${v.key}: ${v.rawSessionToken}`);
    }
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
