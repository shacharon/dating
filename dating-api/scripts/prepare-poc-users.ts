/**
 * Prepare POC users for Phase 4 matching.
 *
 * Uses the production service layer (MeProfileService + MeProfileAnalysisService)
 * via NestJS application context — same code path as the HTTP API, no HTTP transport.
 *
 * Run:
 *   npx ts-node --project tsconfig.json scripts/prepare-poc-users.ts
 */

import { NestFactory } from '@nestjs/core';
import { ProfileGender } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MeProfileService } from '../src/me-profile/me-profile.service';
import { MeProfileAnalysisService } from '../src/me-profile/me-profile-analysis.service';

// ── POC users ────────────────────────────────────────────────────────────────
const POC_USERS = [
  {
    label: 'aiavataragents@gmail.com',
    userId: 'cmo3fkcxf0000t5ns7tn4szpr',
    // Profile A: male looking for female — text already in DB, only gender missing
    patch: {
      gender: ProfileGender.MALE,
      desiredPartnerGenders: [ProfileGender.FEMALE],
    },
  },
  {
    label: 'shacharon@gmail.com',
    userId: 'cmnumvg5f0000t5d04ltp4r77',
    patch: null, // already ANALYZED — no action needed
  },
];

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const meProfile = app.get(MeProfileService);
  const analysis = app.get(MeProfileAnalysisService);

  for (const user of POC_USERS) {
    console.log('\n══════════════════════════════════════════════');
    console.log(`User: ${user.label}  (${user.userId})`);

    // ── 1. Read current state ─────────────────────────────────────────
    const profile = await prisma.userProfile.findUnique({
      where: { userId: user.userId },
    });

    if (!profile) {
      console.log('  UserProfile: MISSING — skipping (create via UI first)');
      continue;
    }

    console.log(`  UserProfile.id     : ${profile.id}`);
    console.log(`  UserProfile.status : ${profile.status}`);

    const latestEval = await prisma.userProfileEvaluation.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, version: true, createdAt: true },
    });
    console.log(`  LatestEval         : ${latestEval ? `EXISTS id=${latestEval.id}` : 'MISSING'}`);

    // ── 2. Already match-ready? ──────────────────────────────────────
    if (profile.status === 'ANALYZED' && latestEval) {
      console.log('  → Already ANALYZED + has evaluation. No action needed. ✓');
      continue;
    }

    // ── 3. Patch missing fields (gender / desiredPartnerGenders) ──────
    if (user.patch) {
      console.log(`  → Patching: ${JSON.stringify(user.patch)}`);
      await meProfile.patchForUser(user.userId, user.patch);
      console.log('  Patch applied. ✓');
    }

    // ── 4. Submit (DRAFT / ANALYZED / FAILED → SUBMITTED) ────────────
    const statusNow = (await prisma.userProfile.findUnique({ where: { userId: user.userId } }))?.status;
    if (statusNow === 'SUBMITTED' || statusNow === 'ANALYZING') {
      console.log(`  → Profile already in ${statusNow} — skipping submit`);
    } else {
      console.log('  → Submitting profile...');
      await meProfile.submitForUser(user.userId);
      console.log('  Submitted. ✓');
    }

    // ── 5. Run analysis (synchronously — await the fire-and-forget) ───
    console.log('  → Running analysis (LLM call — may take 10–30s)...');
    await analysis.runForUser(user.userId);

    // ── 6. Verify result ──────────────────────────────────────────────
    const profileAfter = await prisma.userProfile.findUnique({ where: { userId: user.userId } });
    const evalAfter = await prisma.userProfileEvaluation.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      select: { id: true, version: true, createdAt: true },
    });

    console.log(`  Status after       : ${profileAfter?.status}`);
    console.log(`  AnalyzedAt         : ${profileAfter?.analyzedAt}`);
    console.log(`  LastError          : ${profileAfter?.lastAnalysisError ?? 'none'}`);
    console.log(`  EvaluationRow      : ${evalAfter ? `EXISTS  id=${evalAfter.id}  version=${evalAfter.version}` : 'MISSING — analysis may have failed'}`);

    const matchReady = profileAfter?.status === 'ANALYZED' && evalAfter !== null;
    console.log(`  Match-ready        : ${matchReady ? '✓ YES' : '✗ NO'}`);
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════');
  console.log('FINAL STATE:');
  for (const user of POC_USERS) {
    const profile = await prisma.userProfile.findUnique({ where: { userId: user.userId } });
    const evalRow = profile
      ? await prisma.userProfileEvaluation.findFirst({ where: { profileId: profile.id }, orderBy: { createdAt: 'desc' } })
      : null;
    const ready = profile?.status === 'ANALYZED' && evalRow !== null;
    console.log(`  ${user.label.padEnd(32)}  status=${profile?.status ?? 'NO_PROFILE'}  eval=${evalRow ? 'YES' : 'NO'}  match-ready=${ready ? 'YES ✓' : 'NO ✗'}`);
  }

  await app.close();
}

main().catch((e) => {
  console.error('FATAL:', e?.message ?? e);
  process.exit(1);
});
