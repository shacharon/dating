/**
 * Sprint QA local pool Story 1 — seed ~50 deletable Israel profiles (`qa50_*`).
 *
 * Usage (from dating-api):
 *   npm run seed:qa50
 *   npm run seed:qa50 -- --cleanup
 *
 * Safety: local Postgres + local photos only; cleanup scoped to `qa50_*`.
 * Does NOT create MatchListRank (Story 2). Does NOT touch real users / s41val_*.
 */

import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deflateSync } from 'node:zlib';
import {
  PrismaClient,
  ProfileGender,
  UserProfilePhotoStatus,
  UserProfileStatus,
} from '@prisma/client';
import * as dotenv from 'dotenv';
import { COMPATIBILITY_SIGNAL_KEYS } from '../src/compatibility/compatibility-score';
import { loadPhotoStorageConfig } from '../src/photo-storage/photo-storage.config';
import {
  assertAllIdsPrefixed,
  EVAL_VERSION,
  QA50_PREFIX,
  QA50_PROFILE_IDS,
  QA50_PROFILES,
  QA50_USER_IDS,
  QA50_VIEWERS,
  type Qa50ProfileDef,
} from './qa50-fixtures';
import { assertQa50SafeEnvironment } from './qa50-seed-safety';

dotenv.config();

const prisma = new PrismaClient();

function hashSessionToken(rawToken: string, pepper: string): string {
  return createHash('sha256')
    .update(rawToken, 'utf8')
    .update(pepper, 'utf8')
    .digest('hex');
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/**
 * Approach A (Story 4): larger synthetic gradient + soft oval "portrait" blob.
 * Still generated — no stock faces / S3.
 */
function syntheticPortraitPng(
  r: number,
  g: number,
  b: number,
  size = 320,
): Buffer {
  const rows: Buffer[] = [];
  const cx = size * 0.5;
  const cy = size * 0.42;
  const rx = size * 0.28;
  const ry = size * 0.36;
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    row[0] = 0;
    const gy = y / (size - 1);
    for (let x = 0; x < size; x++) {
      const gx = x / (size - 1);
      // Vertical + diagonal wash from base RGB toward lighter/darker ends
      const wash = 0.55 + 0.35 * gy + 0.1 * gx;
      let pr = Math.min(255, Math.round(r * wash + 40 * (1 - gy)));
      let pg = Math.min(255, Math.round(g * wash + 28 * gx));
      let pb = Math.min(255, Math.round(b * wash + 50 * gy));

      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const oval = dx * dx + dy * dy;
      if (oval < 1) {
        const edge = Math.max(0, 1 - oval);
        const lift = 0.25 + 0.55 * edge;
        pr = Math.min(255, Math.round(pr * (1 - lift) + (r + 60) * lift));
        pg = Math.min(255, Math.round(pg * (1 - lift) + (g + 40) * lift));
        pb = Math.min(255, Math.round(pb * (1 - lift) + (b + 30) * lift));
      }

      const o = 1 + x * 3;
      row[o] = pr;
      row[o + 1] = pg;
      row[o + 2] = pb;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(Buffer.concat(rows), { level: 6 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeEvalJson(
  summary: string,
  signalValue: number,
  interestsTop3: string[],
) {
  const signals: Record<string, number> = {};
  for (const k of COMPATIBILITY_SIGNAL_KEYS) {
    signals[k] = signalValue;
  }
  const makeDomain = (domain: 'self' | 'partner' | 'relationship') => ({
    domain,
    signals: { ...signals },
    evidence: [],
    version: 'v1',
    confidence: 0.9,
    domainStatus: 'OK',
  });
  return {
    self: makeDomain('self'),
    partner: makeDomain('partner'),
    relationship: makeDomain('relationship'),
    compatibility: {
      selfVsPartner: {
        overallScore: 70,
        coverage: 1,
        matchedSignals: COMPATIBILITY_SIGNAL_KEYS.length,
        hardMismatches: [],
        breakdown: [],
      },
      selfVsRelationship: {
        overallScore: 70,
        coverage: 1,
        matchedSignals: COMPATIBILITY_SIGNAL_KEYS.length,
        hardMismatches: [],
        breakdown: [],
      },
    },
    display: {
      summary,
      insight: 'QA50 seed profile.',
      overallNarrative: summary,
      aboutMeInsight: summary,
      relationshipInsight: 'QA50 seed profile.',
      partnerInsight: 'QA50 seed profile.',
      missingPrompts: [],
    },
    productScores: {},
    productScoresPresentation: {},
    flags: [],
    enrichment: {
      version: 'v1',
      signals: {
        dailyRhythm: null,
        autonomyTogethernessDepth: null,
        kidsTimeline: null,
        conflictStyleDetail: null,
        relationshipPace: null,
        communicationMode: null,
        interestsTop3,
      },
    },
  };
}

async function writeLocalPhoto(storageKey: string, bytes: Buffer): Promise<void> {
  const fullPath = resolve(process.cwd(), storageKey);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
}

async function upsertApprovedPhoto(def: Qa50ProfileDef): Promise<void> {
  const uploadDir = loadPhotoStorageConfig(process.env).uploadDir;
  const storageKey = `${uploadDir.replace(/\\/g, '/')}/${def.profileId}/${def.photoId}.png`;
  const bytes = syntheticPortraitPng(
    def.photoRgb[0],
    def.photoRgb[1],
    def.photoRgb[2],
  );
  await writeLocalPhoto(storageKey, bytes);

  await prisma.userProfilePhoto.upsert({
    where: { id: def.photoId },
    create: {
      id: def.photoId,
      profileId: def.profileId,
      storageKey,
      originalFileName: `${def.photoId}.png`,
      mimeType: 'image/png',
      sizeBytes: bytes.length,
      position: 0,
      isPrimary: true,
      status: UserProfilePhotoStatus.APPROVED,
      moderationProvider: 'mock',
    },
    update: {
      storageKey,
      mimeType: 'image/png',
      sizeBytes: bytes.length,
      position: 0,
      isPrimary: true,
      status: UserProfilePhotoStatus.APPROVED,
      moderationProvider: 'mock',
      rejectionReason: null,
    },
  });
}

async function upsertProfile(def: Qa50ProfileDef): Promise<void> {
  const gender =
    def.gender === 'MALE' ? ProfileGender.MALE : ProfileGender.FEMALE;
  const desired =
    def.gender === 'MALE' ? [ProfileGender.FEMALE] : [ProfileGender.MALE];

  await prisma.user.upsert({
    where: { id: def.userId },
    create: {
      id: def.userId,
      email: def.email,
      googleId: `google_qa50_${def.key}`,
      displayName: def.displayName,
      status: 'ACTIVE',
    },
    update: { displayName: def.displayName, email: def.email },
  });

  await prisma.userProfile.upsert({
    where: { id: def.profileId },
    create: {
      id: def.profileId,
      userId: def.userId,
      name: def.displayName,
      nickname: def.nickname,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      onboardingCompletedAt: new Date(),
      gender,
      desiredPartnerGenders: desired,
      birthDate: new Date(`${def.birthDate}T00:00:00.000Z`),
      aboutMe: def.aboutMe,
      aboutPartner: 'Looking for a kind long-term partner.',
      aboutRelationship: 'Serious dating with clear intentions.',
      city: def.city,
      country: 'IL',
      locationLabel: `${def.city}, IL`,
      wantsChildren: def.wantsChildren,
      interestsTop: [...def.interests],
      analyzedAt: new Date(),
      submittedAt: new Date(),
    },
    update: {
      name: def.displayName,
      nickname: def.nickname,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      gender,
      desiredPartnerGenders: desired,
      birthDate: new Date(`${def.birthDate}T00:00:00.000Z`),
      aboutMe: def.aboutMe,
      city: def.city,
      country: 'IL',
      locationLabel: `${def.city}, IL`,
      wantsChildren: def.wantsChildren,
      interestsTop: [...def.interests],
      analyzedAt: new Date(),
    },
  });

  await prisma.userProfilePreference.upsert({
    where: { profileId: def.profileId },
    create: {
      profileId: def.profileId,
      acceptedPartnerGenders: desired.map(String),
      // Null age window: avoid HG AGE FAIL when a real viewer has no birthDate (Story 4).
      partnerAgeMin: null,
      partnerAgeMax: null,
    },
    update: {
      acceptedPartnerGenders: desired.map(String),
      partnerAgeMin: null,
      partnerAgeMax: null,
    },
  });

  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: def.profileId },
  });
  await prisma.userProfileEvaluation.create({
    data: {
      profileId: def.profileId,
      version: EVAL_VERSION,
      evaluationJson: makeEvalJson(
        def.aboutMe,
        def.signalValue,
        [...def.interests],
      ),
    },
  });

  await prisma.userProfileInterest.deleteMany({
    where: { profileId: def.profileId },
  });
  for (let i = 0; i < def.interests.length; i++) {
    await prisma.userProfileInterest.create({
      data: {
        profileId: def.profileId,
        tag: def.interests[i]!,
        rank: i,
        source: 'qa50_seed',
        evalVersion: EVAL_VERSION,
      },
    });
  }

  await upsertApprovedPhoto(def);
}

async function upsertViewerSession(
  def: Qa50ProfileDef,
  pepper: string,
): Promise<void> {
  if (!def.sessionId || !def.rawSessionToken) return;
  const sessionTokenHash = hashSessionToken(def.rawSessionToken, pepper);
  await prisma.userSession.upsert({
    where: { id: def.sessionId },
    create: {
      id: def.sessionId,
      userId: def.userId,
      sessionTokenHash,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
    },
    update: {
      sessionTokenHash,
      expiresAt: new Date(Date.now() + 30 * 86_400_000),
      revokedAt: null,
    },
  });
}

async function cleanup(): Promise<void> {
  assertQa50SafeEnvironment();
  assertAllIdsPrefixed([...QA50_USER_IDS, ...QA50_PROFILE_IDS]);

  console.log(`\n── Cleanup QA50 pool (${QA50_PREFIX}*) ──`);

  const photos = await prisma.userProfilePhoto.findMany({
    where: { profileId: { in: [...QA50_PROFILE_IDS] } },
    select: { storageKey: true },
  });
  for (const p of photos) {
    await rm(resolve(process.cwd(), p.storageKey), { force: true }).catch(
      () => undefined,
    );
  }

  await prisma.matchListRank.deleteMany({
    where: {
      OR: [
        { viewerUserId: { in: [...QA50_USER_IDS] } },
        { candidateProfileId: { in: [...QA50_PROFILE_IDS] } },
      ],
    },
  });
  await prisma.matchAction.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: [...QA50_USER_IDS] } },
        { targetUserId: { in: [...QA50_USER_IDS] } },
      ],
    },
  });
  await prisma.userProfilePhoto.deleteMany({
    where: { profileId: { in: [...QA50_PROFILE_IDS] } },
  });
  await prisma.userProfileInterest.deleteMany({
    where: { profileId: { in: [...QA50_PROFILE_IDS] } },
  });
  await prisma.userProfileSignal.deleteMany({
    where: { profileId: { in: [...QA50_PROFILE_IDS] } },
  });
  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: { in: [...QA50_PROFILE_IDS] } },
  });
  await prisma.userProfilePreference.deleteMany({
    where: { profileId: { in: [...QA50_PROFILE_IDS] } },
  });
  await prisma.userSession.deleteMany({
    where: { userId: { in: [...QA50_USER_IDS] } },
  });
  await prisma.userProfile.deleteMany({
    where: { id: { in: [...QA50_PROFILE_IDS] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [...QA50_USER_IDS] } },
  });

  console.log(
    `cleaned ${QA50_PROFILE_IDS.length} profiles / ${QA50_USER_IDS.length} users`,
  );
}

async function seed(): Promise<void> {
  assertQa50SafeEnvironment();
  assertAllIdsPrefixed([...QA50_USER_IDS, ...QA50_PROFILE_IDS]);

  if (QA50_PROFILES.length !== 50) {
    throw new Error(`Expected 50 profiles, got ${QA50_PROFILES.length}`);
  }

  const pepper = process.env.SESSION_SECRET_PEPPER ?? '';
  if (!pepper) {
    throw new Error('SESSION_SECRET_PEPPER not set in .env');
  }

  console.log('\n── Seeding QA50 Israel pool ──');
  console.log(`profiles=${QA50_PROFILES.length}`);

  for (const def of QA50_PROFILES) {
    await upsertProfile(def);
    if (def.isViewer) await upsertViewerSession(def, pepper);
    process.stdout.write('.');
  }
  console.log('\n');

  console.log('✓ Seed complete.\n');
  console.log('Viewer cookies (dating_session):');
  for (const v of QA50_VIEWERS) {
    console.log(`  ${v.key} (${v.gender}, ${v.city}): ${v.rawSessionToken}`);
  }
  console.log('\nVerify: npm run verify:qa50');
  console.log('Cleanup: npm run seed:qa50 -- --cleanup');
  console.log('Matches: Story 2 (backfill / ranks)\n');
}

async function main(): Promise<void> {
  if (process.argv.includes('--cleanup')) await cleanup();
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
