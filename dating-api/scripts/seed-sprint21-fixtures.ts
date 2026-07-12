/**
 * Seed Sprint 21 fixture profiles into local Postgres for API/DB/UI inspection.
 *
 * Usage (from dating-api, DATABASE_URL set):
 *   npx ts-node --project tsconfig.json scripts/seed-sprint21-fixtures.ts
 *   npx ts-node --project tsconfig.json scripts/seed-sprint21-fixtures.ts --cleanup
 *
 * Safe to re-run (upsert by stable IDs). Does NOT push to remote — local only.
 */

import {
  PrismaClient,
  ProfileGender,
  UserProfileStatus,
} from '@prisma/client';
import { SPRINT21_PAIRS, seedIdsForProfile } from './sprint21-fixtures';

const prisma = new PrismaClient();
const EVAL_VERSION = 'sprint21-fixture-v1';

async function cleanup() {
  const profileIds = SPRINT21_PAIRS.flatMap((p) => [p.a.id, p.b.id]);
  const userIds = profileIds.map((id) => seedIdsForProfile(id).userId);

  await prisma.userProfileInterest.deleteMany({
    where: { profileId: { in: profileIds } },
  });
  await prisma.userProfileSignal.deleteMany({
    where: { profileId: { in: profileIds } },
  });
  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: { in: profileIds } },
  });
  await prisma.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  console.log(`cleaned ${profileIds.length} Sprint 21 fixture profiles`);
}

async function upsertProfile(opts: {
  profileId: string;
  name: string;
  evaluation: unknown;
  interests: string[];
  conflictStyle: number | null;
  gender: ProfileGender;
  desired: ProfileGender[];
}) {
  const ids = seedIdsForProfile(opts.profileId);

  await prisma.user.upsert({
    where: { id: ids.userId },
    create: {
      id: ids.userId,
      email: ids.email,
      googleId: `google_${ids.userId}`,
      displayName: opts.name,
    },
    update: { displayName: opts.name },
  });

  await prisma.userProfile.upsert({
    where: { id: opts.profileId },
    create: {
      id: opts.profileId,
      userId: ids.userId,
      status: UserProfileStatus.ANALYZED,
      gender: opts.gender,
      desiredPartnerGenders: opts.desired,
      birthDate: new Date('1992-01-15'),
      locationLabel: 'Tel Aviv',
      city: 'Tel Aviv',
      country: 'Israel',
      aboutMe: `${opts.name} — Sprint 21 fixture about me.`,
      aboutPartner: `${opts.name} — Sprint 21 fixture about partner.`,
      aboutRelationship: `${opts.name} — Sprint 21 fixture about relationship.`,
      analyzedAt: new Date(),
      interestsTop: opts.interests,
      sigConflictStyle: opts.conflictStyle,
    },
    update: {
      status: UserProfileStatus.ANALYZED,
      gender: opts.gender,
      desiredPartnerGenders: opts.desired,
      analyzedAt: new Date(),
      interestsTop: opts.interests,
      sigConflictStyle: opts.conflictStyle,
      aboutMe: `${opts.name} — Sprint 21 fixture about me.`,
    },
  });

  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: opts.profileId },
  });
  await prisma.userProfileEvaluation.create({
    data: {
      profileId: opts.profileId,
      version: EVAL_VERSION,
      evaluationJson: opts.evaluation as never,
    },
  });

  await prisma.userProfileInterest.deleteMany({
    where: { profileId: opts.profileId },
  });
  for (let i = 0; i < opts.interests.length; i++) {
    await prisma.userProfileInterest.create({
      data: {
        profileId: opts.profileId,
        tag: opts.interests[i],
        rank: i,
        source: 'sprint21_fixture',
        evalVersion: EVAL_VERSION,
      },
    });
  }

  if (opts.conflictStyle != null) {
    await prisma.userProfileSignal.upsert({
      where: {
        profileId_signalKey: {
          profileId: opts.profileId,
          signalKey: 'conflictStyle',
        },
      },
      create: {
        profileId: opts.profileId,
        signalKey: 'conflictStyle',
        signalValue: opts.conflictStyle,
        evalVersion: EVAL_VERSION,
      },
      update: {
        signalValue: opts.conflictStyle,
        evalVersion: EVAL_VERSION,
      },
    });
  } else {
    await prisma.userProfileSignal.deleteMany({
      where: { profileId: opts.profileId, signalKey: 'conflictStyle' },
    });
  }

  console.log(
    `✓ ${opts.profileId} conflictStyle=${opts.conflictStyle ?? 'null'} interests=[${opts.interests.join(',')}]`,
  );
}

async function seed() {
  for (const pair of SPRINT21_PAIRS) {
    console.log(`\nSeeding pair ${pair.id}…`);
    await upsertProfile({
      profileId: pair.a.id,
      name: pair.a.name,
      evaluation: pair.a.evaluation,
      interests: pair.interestsA,
      conflictStyle: pair.conflictStyleA,
      gender: ProfileGender.MALE,
      desired: [ProfileGender.FEMALE],
    });
    await upsertProfile({
      profileId: pair.b.id,
      name: pair.b.name,
      evaluation: pair.b.evaluation,
      interests: pair.interestsB,
      conflictStyle: pair.conflictStyleB,
      gender: ProfileGender.FEMALE,
      desired: [ProfileGender.MALE],
    });
  }

  console.log('\nDone. Compare pairs:');
  for (const pair of SPRINT21_PAIRS) {
    console.log(
      `  POST /api/v1/matches/compare  { "aId": "${pair.a.id}", "bId": "${pair.b.id}" }  # ${pair.id}`,
    );
  }
  console.log('\nIn-memory field dump (no DB):');
  console.log(
    '  npx ts-node --project tsconfig.json scripts/verify-sprint21-fixtures.ts',
  );
}

async function main() {
  const isCleanup = process.argv.includes('--cleanup');
  if (isCleanup) await cleanup();
  else await seed();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
