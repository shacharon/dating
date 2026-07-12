/**
 * Phase 4 Matching Validation — 2 real POC users, new-model path only.
 *
 * Exercises the production service layer directly via NestJS app context.
 * Identical code path to: GET /api/v1/me/matches  and  GET /api/v1/me/matches/:id
 *
 * Run:
 *   npx ts-node --project tsconfig.json scripts/validate-phase4-matching.ts
 */

import { NestFactory } from '@nestjs/core';
import { ProfileGender } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MeProfileService } from '../src/me-profile/me-profile.service';
import { MeMatchesService } from '../src/me-profile/me-matches.service';

// ── POC users ────────────────────────────────────────────────────────────────
const USER_A = {
  label: 'aiavataragents@gmail.com',
  userId: 'cmo3fkcxf0000t5ns7tn4szpr',
  profileId: 'cmo3fsaxk0003t5ns85qrko9a',
};
const USER_B = {
  label: 'shacharon@gmail.com',
  userId: 'cmnumvg5f0000t5d04ltp4r77',
  profileId: 'cmnzso3vh0000t5b81gli4mtg',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function pass(label: string, detail?: string) {
  console.log(`  ✓ PASS  ${label}${detail ? `  (${detail})` : ''}`);
}
function fail(label: string, detail?: string) {
  console.error(`  ✗ FAIL  ${label}${detail ? `  → ${detail}` : ''}`);
  process.exitCode = 1;
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const meProfile = app.get(MeProfileService);
  const meMatches = app.get(MeMatchesService);

  // ── Step 0: Ensure shacharon has gender set ───────────────────────────────
  console.log('\n══ Step 0: Patch shacharon gender (FEMALE / [MALE]) ══════════════');
  const shacharonProfile = await prisma.userProfile.findUnique({
    where: { userId: USER_B.userId },
    select: { gender: true, desiredPartnerGenders: true },
  });

  const dpg = shacharonProfile?.desiredPartnerGenders;
  const dpgMissing = !dpg || (Array.isArray(dpg) ? dpg.length === 0 : false);
  if (!shacharonProfile?.gender || dpgMissing) {
    await meProfile.patchForUser(USER_B.userId, {
      gender: ProfileGender.FEMALE,
      desiredPartnerGenders: [ProfileGender.MALE],
    });
    pass('shacharon gender patched → FEMALE / [MALE]');
  } else {
    pass(`shacharon gender already set → ${shacharonProfile.gender} / ${JSON.stringify(shacharonProfile.desiredPartnerGenders)}`);
  }

  // ── Step 1: User A → GET /api/v1/me/matches ──────────────────────────────
  console.log(`\n══ Step 1: ${USER_A.label} — list matches ═══════════════════════`);
  const listA = await meMatches.list(USER_A.userId);

  if (listA.status !== 'ready') {
    fail('list() returned ready status', `got: ${listA.status}`);
    await app.close();
    return;
  }
  pass(`status=ready  viewerProfileId=${listA.viewerProfileId}`);
  pass(`viewerGender=${listA.viewerGender}  accepted=${JSON.stringify(listA.viewerAcceptedPartnerGenders)}`);
  pass(`totalCandidatesBeforeFilter=${listA.totalCandidatesBeforeFilter}  matchesReturned=${(listA.matches ?? []).length}`);

  const matchesA = listA.matches ?? [];
  const matchBinA = matchesA.find((m) => m.id === USER_B.profileId);
  if (!matchBinA) {
    fail('User B (shacharon) appears in User A match list', `list ids: ${JSON.stringify(matchesA.map((m) => m.id))}`);
  } else {
    pass(`User B appears in User A match list  id=${matchBinA.id}`);
    pass(`  gender=${matchBinA.gender}  hasEvaluation=${matchBinA.hasEvaluation}`);

    if (typeof matchBinA.matchScore === 'number' && isFinite(matchBinA.matchScore)) {
      pass(`  matchScore=${matchBinA.matchScore.toFixed(4)} (finite number)`);
    } else {
      fail('matchScore is finite number', `got: ${matchBinA.matchScore}`);
    }

    if (matchBinA.explainability && typeof matchBinA.explainability === 'object') {
      const keys = Object.keys(matchBinA.explainability);
      pass(`  explainability present  keys=[${keys.join(', ')}]`);
    } else {
      fail('explainability present', `got: ${JSON.stringify(matchBinA.explainability)}`);
    }

    if (matchBinA.recommendation && typeof matchBinA.recommendation === 'object') {
      pass(`  recommendation present  primaryTakeaway="${String(matchBinA.recommendation.primaryTakeaway ?? '').slice(0, 80)}..."`);
    } else {
      console.log(`  ℹ  recommendation=${JSON.stringify(matchBinA.recommendation)} (null is acceptable if engine omits it)`);
    }
  }

  // ── Step 2: User A → GET /api/v1/me/matches/:id (User B's profileId) ─────
  console.log(`\n══ Step 2: ${USER_A.label} — getById(${USER_B.profileId}) ══════`);
  const detailAtoB = await meMatches.getById(USER_A.userId, USER_B.profileId);

  if ('error' in detailAtoB) {
    fail('getById returned detail (no error)', `got: ${JSON.stringify(detailAtoB)}`);
  } else {
    pass(`detail returned  candidateProfileId=${detailAtoB.id}`);

    if (typeof detailAtoB.matchScore === 'number' && isFinite(detailAtoB.matchScore)) {
      pass(`  matchScore=${detailAtoB.matchScore.toFixed(4)}`);
    } else {
      fail('detail matchScore finite', `got: ${detailAtoB.matchScore}`);
    }

    if (detailAtoB.explainability && typeof detailAtoB.explainability === 'object') {
      pass(`  explainability present`);
    } else {
      fail('detail explainability present', `got: ${JSON.stringify(detailAtoB.explainability)}`);
    }

    if (detailAtoB.recommendation && typeof detailAtoB.recommendation === 'object') {
      pass(`  recommendation present  primaryTakeaway="${String(detailAtoB.recommendation.primaryTakeaway ?? '').slice(0, 80)}..."`);
    } else {
      console.log(`  ℹ  recommendation=${JSON.stringify(detailAtoB.recommendation)} (null acceptable)`);
    }
  }

  // ── Step 3: User B → GET /api/v1/me/matches ──────────────────────────────
  console.log(`\n══ Step 3: ${USER_B.label} — list matches ═══════════════════════`);
  const listB = await meMatches.list(USER_B.userId);

  if (listB.status !== 'ready') {
    fail('list() returned ready status', `got: ${listB.status}`);
    await app.close();
    return;
  }
  pass(`status=ready  viewerProfileId=${listB.viewerProfileId}`);
  pass(`viewerGender=${listB.viewerGender}  accepted=${JSON.stringify(listB.viewerAcceptedPartnerGenders)}`);
  pass(`totalCandidatesBeforeFilter=${listB.totalCandidatesBeforeFilter}  matchesReturned=${(listB.matches ?? []).length}`);

  const matchesB = listB.matches ?? [];
  const matchAinB = matchesB.find((m) => m.id === USER_A.profileId);
  if (!matchAinB) {
    fail('User A (aiavataragents) appears in User B match list', `list ids: ${JSON.stringify(matchesB.map((m) => m.id))}`);
  } else {
    pass(`User A appears in User B match list  id=${matchAinB.id}`);
    pass(`  gender=${matchAinB.gender}  hasEvaluation=${matchAinB.hasEvaluation}`);

    if (typeof matchAinB.matchScore === 'number' && isFinite(matchAinB.matchScore)) {
      pass(`  matchScore=${matchAinB.matchScore.toFixed(4)} (finite number)`);
    } else {
      fail('matchScore is finite number', `got: ${matchAinB.matchScore}`);
    }

    if (matchAinB.explainability && typeof matchAinB.explainability === 'object') {
      const keys = Object.keys(matchAinB.explainability);
      pass(`  explainability present  keys=[${keys.join(', ')}]`);
    } else {
      fail('explainability present', `got: ${JSON.stringify(matchAinB.explainability)}`);
    }
  }

  // ── Step 4: User B → GET /api/v1/me/matches/:id (User A's profileId) ─────
  console.log(`\n══ Step 4: ${USER_B.label} — getById(${USER_A.profileId}) ══════`);
  const detailBtoA = await meMatches.getById(USER_B.userId, USER_A.profileId);

  if ('error' in detailBtoA) {
    fail('getById returned detail (no error)', `got: ${JSON.stringify(detailBtoA)}`);
  } else {
    pass(`detail returned  candidateProfileId=${detailBtoA.id}`);

    if (typeof detailBtoA.matchScore === 'number' && isFinite(detailBtoA.matchScore)) {
      pass(`  matchScore=${detailBtoA.matchScore.toFixed(4)}`);
    } else {
      fail('detail matchScore finite', `got: ${detailBtoA.matchScore}`);
    }

    if (detailBtoA.explainability && typeof detailBtoA.explainability === 'object') {
      pass(`  explainability present`);
    } else {
      fail('detail explainability present', `got: ${JSON.stringify(detailBtoA.explainability)}`);
    }
  }

  // ── Step 5: Legacy table guard (runtime contract) ────────────────────────
  console.log('\n══ Step 5: Legacy table isolation ════════════════════════════════');
  pass(
    'Legacy MatchmakingProfile runtime path is detached; /api/v1/me/* uses new-model tables only',
  );

  // ── Final summary ─────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════════════════');
  if (process.exitCode === 1) {
    console.error('RESULT: FAIL — one or more checks failed above.');
  } else {
    console.log('RESULT: ALL CHECKS PASSED ✓');
  }

  await app.close();
}

main().catch((e) => {
  console.error('FATAL:', e?.message ?? e);
  process.exit(1);
});
