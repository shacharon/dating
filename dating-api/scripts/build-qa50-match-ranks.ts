/**
 * Sprint QA pool Story 2 — build MatchListRank rows for qa50 viewers only.
 *
 * Usage (from dating-api):
 *   npm run qa50:ranks              # demo scores (default, AC)
 *   npm run qa50:ranks -- --demo
 *   npm run qa50:ranks -- --engine  # sync compareWithStatus scores
 *
 * Never deletes s41val_* (or other) viewers' ranks — only qa50 viewer userIds.
 */

import { PrismaClient, UserProfileStatus } from '@prisma/client';
import * as dotenv from 'dotenv';
import { compareWithStatus } from '../src/matches/match-engine';
import { evaluateHolyGrailPairDirections } from '../src/matches/holy-grail-pair-directions';
import { calculatePriorityTier } from '../src/me-profile/match-priority';
import { buildMeMatchesParticipantReadModel } from '../src/me-profile/me-profile-engine.mapper';
import {
  QA50_PROFILE_IDS,
  QA50_PROFILES,
  QA50_VIEWERS,
  type Qa50ProfileDef,
} from './qa50-fixtures';
import { assertQa50SafeEnvironment } from './qa50-seed-safety';

dotenv.config();

const prisma = new PrismaClient();

const DEMO_SCORES = [92, 88, 80, 76, 72, 62, 55, 48] as const;

function modeFromArgs(argv: string[]): 'demo' | 'engine' {
  if (argv.includes('--engine')) return 'engine';
  return 'demo'; // default; --demo explicit OK
}

function candidatesForViewer(viewer: Qa50ProfileDef): Qa50ProfileDef[] {
  const want = viewer.gender === 'MALE' ? 'FEMALE' : 'MALE';
  return QA50_PROFILES.filter(
    (p) => p.key !== viewer.key && p.gender === want,
  ).sort((a, b) => a.profileId.localeCompare(b.profileId));
}

function histogram(scores: number[]): Record<string, number> {
  const h = { HIGH: 0, GOOD: 0, OTHER: 0 };
  for (const s of scores) h[calculatePriorityTier(s)] += 1;
  return h;
}

async function replaceRanksForViewer(
  viewerUserId: string,
  rows: { candidateProfileId: string; matchScore: number }[],
): Promise<void> {
  if (!viewerUserId.startsWith('qa50_')) {
    throw new Error(`Refusing non-qa50 viewerUserId: ${viewerUserId}`);
  }
  for (const r of rows) {
    if (!QA50_PROFILE_IDS.includes(r.candidateProfileId)) {
      throw new Error(`Refusing non-qa50 candidate: ${r.candidateProfileId}`);
    }
  }

  const builtAt = new Date();
  await prisma.matchListRank.deleteMany({ where: { viewerUserId } });
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

async function buildDemo(viewer: Qa50ProfileDef): Promise<number[]> {
  const cands = candidatesForViewer(viewer);
  const rows = cands.map((c, i) => ({
    candidateProfileId: c.profileId,
    matchScore: DEMO_SCORES[i % DEMO_SCORES.length]!,
  }));
  await replaceRanksForViewer(viewer.userId, rows);
  return rows.map((r) => r.matchScore);
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

async function buildEngine(viewer: Qa50ProfileDef): Promise<number[]> {
  const viewerRead = await loadParticipant(viewer.profileId);
  if (!viewerRead) {
    console.warn(`  warn: viewer ${viewer.key} not list-ready`);
    await replaceRanksForViewer(viewer.userId, []);
    return [];
  }

  const cands = candidatesForViewer(viewer);
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
  await replaceRanksForViewer(viewer.userId, rows);
  return rows.map((r) => r.matchScore);
}

async function main(): Promise<void> {
  assertQa50SafeEnvironment();
  const mode = modeFromArgs(process.argv);
  console.log(`\n── QA50 match ranks (${mode}) ──`);

  const s41Before = await prisma.matchListRank.count({
    where: { viewerUserId: { startsWith: 's41val_' } },
  });

  for (const viewer of QA50_VIEWERS) {
    const scores =
      mode === 'engine' ? await buildEngine(viewer) : await buildDemo(viewer);
    const h = histogram(scores);
    console.log(
      `  ${viewer.key}: ${scores.length} ranks  HIGH=${h.HIGH} GOOD=${h.GOOD} OTHER=${h.OTHER}`,
    );
    if (mode === 'engine' && scores.length < 10) {
      console.warn(`  warn: ${viewer.key} engine ranks < 10 — use --demo for AC`);
    }
  }

  const s41After = await prisma.matchListRank.count({
    where: { viewerUserId: { startsWith: 's41val_' } },
  });
  if (s41Before !== s41After) {
    throw new Error(
      `s41val ranks changed ${s41Before} -> ${s41After} (should be untouched)`,
    );
  }
  console.log(`✓ s41val viewer ranks unchanged (${s41After})`);
  console.log('\nVerify: npm run verify:qa50-matches');
  console.log('UI: set dating_session to a qa50 viewer cookie → /dating/me-matches\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
