/**
 * Phase F validation — expand ANALYZED profiles using the real product pipeline
 * (MeProfileService + MeProfileAnalysisService), not raw SQL.
 *
 * - Creates new `User` rows (synthetic Google identities; no browser OAuth).
 * - POST-equivalent: `createForUser` → Phase C `UserProfilePreference` upsert.
 * - Submit + await analysis → `UserProfileEvaluation` + normalized signal/interest rows.
 *
 * Does NOT replace manual Google signup for production parity; use this for QA / local DB.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/phase-f-expand-analyzed-profiles.ts -- --dry-run --count=12
 *   npx ts-node --project tsconfig.json scripts/phase-f-expand-analyzed-profiles.ts -- --count=12
 *
 * Requires: DATABASE_URL, OPENAI_API_KEY (real LLM calls per profile).
 */

import { NestFactory } from '@nestjs/core';
import { ProfileGender, UserStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MeProfileService } from '../src/me-profile/me-profile.service';
import { MeProfileAnalysisService } from '../src/me-profile/me-profile-analysis.service';
import { MeMatchesService } from '../src/me-profile/me-matches.service';

function parseArgs(argv: string[]) {
  let dryRun = false;
  let count = 12;
  for (const a of argv) {
    if (a === '--dry-run') dryRun = true;
    const m = /^--count=(\d+)$/.exec(a);
    if (m) count = Math.min(50, Math.max(1, parseInt(m[1], 10)));
  }
  return { dryRun, count };
}

const aboutMe =
  'I enjoy hiking, cooking, and quiet weekends. Looking for someone kind and curious about the world.';
const aboutPartner =
  'Ideally emotionally mature, communicates clearly, and values both independence and togetherness.';
const aboutRelationship =
  'I want a steady partnership built on trust, respect, and shared growth over time.';

async function main() {
  // npm/ts-node may place flags after a `--` separator; scan full argv.
  const { dryRun, count } = parseArgs(process.argv);
  console.log(`phase-f-expand-analyzed-profiles: dryRun=${dryRun} count=${count}`);

  if (dryRun) {
    console.log('Dry run: would create users + profiles + submit + analysis (no DB writes).');
    process.exit(0);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['warn', 'error'],
  });

  const prisma = app.get(PrismaService);
  const meProfile = app.get(MeProfileService);
  const analysis = app.get(MeProfileAnalysisService);
  const matches = app.get(MeMatchesService);

  const stamp = Date.now();
  const createdUserIds: string[] = [];

  for (let i = 0; i < count; i++) {
    const suffix = `${stamp}_${i}`;
    const email = `phasef_expand_${suffix}@test.invalid`;
    const googleId = `phasef_expand_google_${suffix}`;
    const displayName = `PhaseF Expand ${i + 1}/${count}`;

    console.log(`\n── User ${i + 1}/${count}: creating ${email} ──`);

    const user = await prisma.user.create({
      data: {
        email,
        googleId,
        displayName,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      },
    });
    createdUserIds.push(user.id);

    const gender = i % 2 === 0 ? ProfileGender.MALE : ProfileGender.FEMALE;
    const desired =
      gender === ProfileGender.MALE
        ? [ProfileGender.FEMALE]
        : [ProfileGender.MALE];

    await meProfile.createForUser(user.id, {
      gender,
      desiredPartnerGenders: desired,
      birthDate: '1990-06-15',
      aboutMe,
      aboutPartner,
      aboutRelationship,
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
    });

    const prof = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    if (!prof) throw new Error('profile missing after create');
    const pref = await prisma.userProfilePreference.findUnique({
      where: { profileId: prof.id },
    });
    console.log(
      `  profileId=${prof.id}  UserProfilePreference: ${pref ? 'YES' : 'NO — unexpected'}`,
    );

    await meProfile.submitForUser(user.id);
    console.log('  submitted → running analysis (LLM, ~10–40s)...');
    await analysis.runForUser(user.id);

    const after = await prisma.userProfile.findUnique({ where: { userId: user.id } });
    const prefAfter = await prisma.userProfilePreference.findUnique({
      where: { profileId: prof.id },
    });
    console.log(
      `  status=${after?.status}  prefRow=${prefAfter ? 'YES' : 'NO'}  analyzedAt=${after?.analyzedAt?.toISOString() ?? 'null'}`,
    );
    if (after?.status !== 'ANALYZED') {
      console.warn(`  WARN: expected ANALYZED, got ${after?.status} err=${after?.lastAnalysisError ?? ''}`);
    }
  }

  // ── Warm /me/matches once per new user (service-layer; emits HG fallback traces if any) ──
  console.log('\n── Calling MeMatchesService.list once per new user (HG path) ──');
  let matchCalls = 0;
  for (const uid of createdUserIds) {
    const res = await matches.list(uid);
    matchCalls++;
    console.log(`  userId=${uid.slice(0, 8)}…  matches.status=${(res as { status?: string }).status ?? '?'}`);
  }

  // ── DB summary ───────────────────────────────────────────────────────
  const analyzedTotal = await prisma.userProfile.count({ where: { status: 'ANALYZED' } });
  const withPref = await prisma.userProfilePreference.count({
    where: { profile: { status: 'ANALYZED' } },
  });
  const coveragePct =
    analyzedTotal === 0 ? 0 : Math.round((10000 * withPref) / analyzedTotal) / 100;

  console.log('\n══════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log(`  New users created       : ${createdUserIds.length}`);
  console.log(`  Total ANALYZED profiles : ${analyzedTotal}`);
  console.log(`  ANALYZED with pref row  : ${withPref}`);
  console.log(`  Preference coverage %   : ${coveragePct}%`);
  console.log(`  /me/matches list calls  : ${matchCalls}`);
  console.log('══════════════════════════════════════════════');
  console.log(
    'Next: grep structured logs for errorCode ME_MATCHES_HG_PREF_FALLBACK, or:',
    '  Select-String -Path dating-api/logs/logs*.log -Pattern ME_MATCHES_HG_PREF_FALLBACK',
  );

  await app.close();
}

main().catch((e) => {
  console.error('FATAL:', e?.message ?? e);
  process.exit(1);
});
