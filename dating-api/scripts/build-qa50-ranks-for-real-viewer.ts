/**
 * Sprint QA pool Story 4 — MatchListRank for ONE real local viewer → qa50_* only.
 *
 * Usage (from dating-api):
 *   npm run qa50:ranks-real -- --email=you@example.com
 *   npm run qa50:ranks-real -- --email=you@example.com --engine
 *   set QA50_REAL_VIEWER_EMAIL=you@example.com && npm run qa50:ranks-real
 *
 * Safety: deletes only ranks where candidateProfileId starts with qa50_.
 * Never wipes non-qa50 ranks for that viewer. Never touches other viewers.
 */

import { PrismaClient, UserProfileStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import { compareWithStatus } from '../src/matches/match-engine';
import { evaluateHolyGrailPairDirections } from '../src/matches/holy-grail-pair-directions';
import { calculatePriorityTier } from '../src/me-profile/match-priority';
import { buildMeMatchesParticipantReadModel } from '../src/me-profile/me-profile-engine.mapper';
import { QA50_PREFIX, QA50_PROFILE_IDS, QA50_PROFILES } from './qa50-fixtures';
import { assertQa50SafeEnvironment } from './qa50-seed-safety';

dotenv.config();

const prisma = new PrismaClient();

const DEMO_SCORES = [92, 88, 80, 76, 72, 62, 55, 48] as const;

function modeFromArgs(argv: string[]): 'demo' | 'engine' {
  if (argv.includes('--engine')) return 'engine';
  return 'demo';
}

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

function histogram(scores: number[]): Record<string, number> {
  const h = { HIGH: 0, GOOD: 0, OTHER: 0 };
  for (const s of scores) h[calculatePriorityTier(s)] += 1;
  return h;
}

function assertNotFixtureUserId(userId: string): void {
  if (userId.startsWith('qa50_') || userId.startsWith('s41val_')) {
    throw new Error(
      `Refusing fixture viewer userId=${userId} (use qa50:ranks for qa50 viewers)`,
    );
  }
}

async function countNonQa50Ranks(viewerUserId: string): Promise<number> {
  return prisma.matchListRank.count({
    where: {
      viewerUserId,
      NOT: { candidateProfileId: { startsWith: QA50_PREFIX } },
    },
  });
}

async function resolveViewer(argv: string[]): Promise<{
  userId: string;
  email: string;
  profileId: string;
  gender: string;
  partnerGenders: string[];
}> {
  const email =
    argValue(argv, '--email') ?? process.env.QA50_REAL_VIEWER_EMAIL?.trim();
  const userIdFlag = argValue(argv, '--userId');

  if (!email && !userIdFlag) {
    throw new Error(
      'Required: --email=you@example.com (or QA50_REAL_VIEWER_EMAIL / --userId=…)',
    );
  }

  const user = userIdFlag
    ? await prisma.user.findUnique({ where: { id: userIdFlag } })
    : await prisma.user.findUnique({ where: { email: email! } });

  if (!user) {
    throw new Error(
      userIdFlag
        ? `User not found for --userId=${userIdFlag}`
        : `User not found for email=${email}`,
    );
  }
  assertNotFixtureUserId(user.id);

  const profile = await prisma.userProfile.findFirst({
    where: { userId: user.id },
    include: { preference: true },
  });
  if (!profile) {
    throw new Error(`No profile for user ${user.email} (${user.id})`);
  }
  if (profile.status !== UserProfileStatus.ANALYZED) {
    throw new Error(
      `Profile ${profile.id} status=${profile.status} (need ANALYZED)`,
    );
  }

  const fromPref = profile.preference?.acceptedPartnerGenders ?? [];
  const fromDesired = Array.isArray(profile.desiredPartnerGenders)
    ? (profile.desiredPartnerGenders as string[])
    : [];
  let partnerGenders =
    fromPref.length > 0 ? [...fromPref] : [...fromDesired].map(String);

  if (partnerGenders.length === 0) {
    if (profile.gender === 'MALE') partnerGenders = ['FEMALE'];
    else if (profile.gender === 'FEMALE') partnerGenders = ['MALE'];
    else {
      throw new Error(
        `Cannot infer partner genders for profile ${profile.id} (gender=${profile.gender})`,
      );
    }
  }

  return {
    userId: user.id,
    email: user.email,
    profileId: profile.id,
    gender: String(profile.gender ?? ''),
    partnerGenders,
  };
}

function candidatesForPartners(partnerGenders: string[]) {
  const want = new Set(partnerGenders.map((g) => g.toUpperCase()));
  return QA50_PROFILES.filter((p) => want.has(p.gender)).sort((a, b) =>
    a.profileId.localeCompare(b.profileId),
  );
}

async function replaceQa50RanksOnly(
  viewerUserId: string,
  rows: { candidateProfileId: string; matchScore: number }[],
): Promise<void> {
  assertNotFixtureUserId(viewerUserId);
  for (const r of rows) {
    if (!r.candidateProfileId.startsWith(QA50_PREFIX)) {
      throw new Error(`Refusing non-qa50 candidate: ${r.candidateProfileId}`);
    }
    if (!QA50_PROFILE_IDS.includes(r.candidateProfileId)) {
      throw new Error(`Candidate not in qa50 catalog: ${r.candidateProfileId}`);
    }
  }

  const builtAt = new Date();
  await prisma.matchListRank.deleteMany({
    where: {
      viewerUserId,
      candidateProfileId: { startsWith: QA50_PREFIX },
    },
  });
  if (rows.length === 0) return;

  await prisma.matchListRank.createMany({
    data: rows.map((r) => ({
      viewerUserId,
      candidateProfileId: r.candidateProfileId,
      matchScore: r.matchScore,
      hardBlocked: false,
      builtAt,
    })),
  });
}

async function loadParticipant(profileId: string) {
  const row = await prisma.userProfile.findUnique({
    where: { id: profileId },
    include: {
      preference: true,
      signals: true,
      interests: { orderBy: { rank: 'asc' } },
      photos: {
        where: { status: 'APPROVED' },
        take: 1,
      },
    },
  });
  if (!row || row.status !== UserProfileStatus.ANALYZED) return null;
  if ((row.photos?.length ?? 0) < 1) return null;
  const evaluation = await prisma.userProfileEvaluation.findFirst({
    where: { profileId },
    orderBy: { createdAt: 'desc' },
  });
  if (!evaluation) return null;
  return buildMeMatchesParticipantReadModel(
    row,
    row.preference,
    evaluation,
    {
      signals: row.signals,
      interests: row.interests,
    },
  );
}

async function buildDemo(
  viewerUserId: string,
  partnerGenders: string[],
): Promise<number[]> {
  const cands = candidatesForPartners(partnerGenders);
  const rows = cands.map((c, i) => ({
    candidateProfileId: c.profileId,
    matchScore: DEMO_SCORES[i % DEMO_SCORES.length]!,
  }));
  await replaceQa50RanksOnly(viewerUserId, rows);
  return rows.map((r) => r.matchScore);
}

async function buildEngine(
  viewerUserId: string,
  viewerProfileId: string,
  partnerGenders: string[],
): Promise<number[]> {
  const viewerRead = await loadParticipant(viewerProfileId);
  if (!viewerRead) {
    console.warn('  warn: real viewer not list-ready for engine mode');
    await replaceQa50RanksOnly(viewerUserId, []);
    return [];
  }

  const cands = candidatesForPartners(partnerGenders);
  const rows: { candidateProfileId: string; matchScore: number }[] = [];

  for (const c of cands) {
    const candRead = await loadParticipant(c.profileId);
    if (!candRead) continue;

    const hg = evaluateHolyGrailPairDirections(
      viewerRead.hg.row,
      candRead.hg.row,
    );
    if (
      hg != null &&
      (hg.aToB.overallHardEligibility === 'FAIL' ||
        hg.bToA.overallHardEligibility === 'FAIL')
    ) {
      continue;
    }

    const cmp = compareWithStatus(
      viewerRead.enginePayload,
      candRead.enginePayload,
    );
    if ('status' in cmp || typeof cmp.finalScore !== 'number') continue;
    rows.push({
      candidateProfileId: c.profileId,
      matchScore: cmp.finalScore,
    });
  }

  rows.sort((a, b) => b.matchScore - a.matchScore);
  await replaceQa50RanksOnly(viewerUserId, rows);
  return rows.map((r) => r.matchScore);
}

async function main(): Promise<void> {
  assertQa50SafeEnvironment();
  const mode = modeFromArgs(process.argv);
  const viewer = await resolveViewer(process.argv);

  console.log(`\n── QA50 ranks for real viewer (${mode}) ──`);
  console.log(`  email=${viewer.email}`);
  console.log(`  userId=${viewer.userId}`);
  console.log(`  profileId=${viewer.profileId} gender=${viewer.gender}`);
  console.log(`  partnerGenders=${viewer.partnerGenders.join(',')}`);

  const nonQa50Before = await countNonQa50Ranks(viewer.userId);
  console.log(`  non-qa50 ranks before: ${nonQa50Before}`);

  const scores =
    mode === 'engine'
      ? await buildEngine(viewer.userId, viewer.profileId, viewer.partnerGenders)
      : await buildDemo(viewer.userId, viewer.partnerGenders);

  const h = histogram(scores);
  console.log(
    `  qa50 ranks written: ${scores.length}  HIGH=${h.HIGH} GOOD=${h.GOOD} OTHER=${h.OTHER}`,
  );
  if (mode === 'engine' && scores.length < 5) {
    console.warn('  warn: engine ranks < 5 — use demo (default) for AC');
  }

  const nonQa50After = await countNonQa50Ranks(viewer.userId);
  if (nonQa50Before !== nonQa50After) {
    throw new Error(
      `non-qa50 ranks changed ${nonQa50Before} -> ${nonQa50After} (must be unchanged)`,
    );
  }
  console.log(`✓ non-qa50 ranks unchanged (${nonQa50After})`);
  console.log(
    '\nVerify: npm run verify:qa50-real -- --email=' + viewer.email,
  );
  console.log('UI: log in as that user → /dating/me-matches\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
