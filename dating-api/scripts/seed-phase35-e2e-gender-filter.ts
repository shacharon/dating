/**
 * Phase 3 Step 4 — E2E gender-filter validation seed.
 *
 * Creates 3 stable test candidates (FEMALE / MALE / OTHER) and their evaluations
 * so that the 3 scenarios below can be verified against GET /api/v1/me/matches.
 *
 * ┌─────────────┬────────┬──────────────────────┬───────────────────────────────┐
 * │ Stable ID   │ Gender │ desiredPartnerGenders │ Appears for viewer when       │
 * ├─────────────┼────────┼──────────────────────┼───────────────────────────────┤
 * │ e2e_cand_b  │ FEMALE │ ['MALE']             │ viewer is MALE (any scenario) │
 * │ e2e_cand_c  │ MALE   │ []                   │ viewer has no gender filter    │
 * │ e2e_cand_f  │ OTHER  │ ['FEMALE']           │ viewer is FEMALE + wants OTHER │
 * └─────────────┴────────┴──────────────────────┴───────────────────────────────┘
 *
 * Scenarios:
 *   S1: viewer MALE, wants=['FEMALE']  → B present, C absent, F absent
 *   S2: viewer MALE, wants=[]          → B present, C present (no hard filter)
 *   S3: viewer FEMALE, wants=['OTHER'] → F present, B absent, C absent
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-phase35-e2e-gender-filter.ts
 *
 * Cleanup (undo):
 *   npx ts-node --project tsconfig.json scripts/seed-phase35-e2e-gender-filter.ts --cleanup
 *
 * Safe to re-run: all writes are idempotent upserts.
 */

import { PrismaClient, ProfileGender, UserProfileStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Stable IDs ───────────────────────────────────────────────────────────────

const CANDIDATES = [
  {
    userId: 'e2e_user_b',
    profileId: 'e2e_cand_b',
    email: 'e2e.cand.b@test.local',
    googleId: 'e2e_google_cand_b',
    displayName: 'E2E Cand-B (FEMALE)',
    gender: ProfileGender.FEMALE,
    desiredPartnerGenders: ['MALE'],
    aboutMe: 'E2E seed: FEMALE candidate, wants MALE.',
    evalLabel: 'strong',
  },
  {
    userId: 'e2e_user_c',
    profileId: 'e2e_cand_c',
    email: 'e2e.cand.c@test.local',
    googleId: 'e2e_google_cand_c',
    displayName: 'E2E Cand-C (MALE, no filter)',
    gender: ProfileGender.MALE,
    desiredPartnerGenders: [] as string[],
    aboutMe: 'E2E seed: MALE candidate, accepts all genders.',
    evalLabel: 'weak',
  },
  {
    userId: 'e2e_user_f',
    profileId: 'e2e_cand_f',
    email: 'e2e.cand.f@test.local',
    googleId: 'e2e_google_cand_f',
    displayName: 'E2E Cand-F (OTHER)',
    gender: ProfileGender.OTHER,
    desiredPartnerGenders: ['FEMALE'],
    aboutMe: 'E2E seed: OTHER candidate, wants FEMALE.',
    evalLabel: 'strong',
  },
] as const;

// ─── Minimal evaluation JSON ──────────────────────────────────────────────────

const SIGNAL_KEYS = [
  'ambition', 'socialBattery', 'healthBodyConsciousness', 'emotionalDepth',
  'attachmentSecurity', 'directness', 'independence', 'traditionalism',
  'financialMindset', 'relationshipClarity', 'spirituality', 'lifestylePace',
  'physicalPriority', 'statusOrientation',
] as const;

function makeEvalJson(label: 'strong' | 'weak', gender: string) {
  const v = label === 'strong' ? 7.5 : 2.5;
  const signals: Record<string, unknown> = {};
  for (const k of SIGNAL_KEYS) {
    signals[k] = { selfScore: v, partnerScore: v, weight: 1.0 };
  }
  return {
    signals,
    display: { summary: `E2E seed ${gender} candidate — ${label} alignment.` },
    meta: { version: 'e2e-phase35-v1', label },
  };
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const birth = new Date('1992-06-01');

  for (const c of CANDIDATES) {
    await prisma.user.upsert({
      where: { id: c.userId },
      create: {
        id: c.userId,
        email: c.email,
        googleId: c.googleId,
        displayName: c.displayName,
      },
      update: {},
    });

    await prisma.userProfile.upsert({
      where: { id: c.profileId },
      create: {
        id: c.profileId,
        userId: c.userId,
        status: UserProfileStatus.ANALYZED,
        gender: c.gender,
        desiredPartnerGenders: c.desiredPartnerGenders,
        birthDate: birth,
        locationLabel: 'Test City',
        city: 'Test City',
        country: 'IL',
        aboutMe: c.aboutMe,
        aboutPartner: 'E2E seed placeholder.',
        analyzedAt: new Date(),
      },
      update: {
        status: UserProfileStatus.ANALYZED,
        gender: c.gender,
        desiredPartnerGenders: c.desiredPartnerGenders,
        analyzedAt: new Date(),
      },
    });

    // Delete stale evaluations then insert a fresh one (idempotent by delete+create).
    await prisma.userProfileEvaluation.deleteMany({ where: { profileId: c.profileId } });
    await prisma.userProfileEvaluation.create({
      data: {
        profileId: c.profileId,
        version: 'e2e-phase35-v1',
        evaluationJson: makeEvalJson(c.evalLabel, c.gender) as never,
      },
    });

    console.log(`  ✓  profileId=${c.profileId}  gender=${c.gender}  desiredPartnerGenders=${JSON.stringify(c.desiredPartnerGenders)}`);
  }

  console.log('\n✅  Seed complete. Run the 3 scenarios against GET /api/v1/me/matches.\n');
  console.log('Expected candidate profile IDs:');
  console.log('  S1 (viewer MALE, wants FEMALE)  → B present  [ e2e_cand_b ]');
  console.log('  S2 (viewer MALE, no filter)     → B+C present [ e2e_cand_b, e2e_cand_c ]');
  console.log('  S3 (viewer FEMALE, wants OTHER) → F present  [ e2e_cand_f ]');
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

async function cleanup() {
  for (const c of CANDIDATES) {
    await prisma.userProfileEvaluation.deleteMany({ where: { profileId: c.profileId } });
    await prisma.userProfile.deleteMany({ where: { id: c.profileId } });
    await prisma.user.deleteMany({ where: { id: c.userId } });
    console.log(`  🗑  deleted profileId=${c.profileId} userId=${c.userId}`);
  }
  console.log('\n✅  Cleanup complete.\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const isCleanup = process.argv.includes('--cleanup');

(isCleanup ? cleanup() : seed())
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
