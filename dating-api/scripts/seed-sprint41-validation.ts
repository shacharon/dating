/**
 * Sprint 41 Story 3 — seed local validation fixtures (Smart Triage UX gate).
 *
 * Usage (from dating-api, DATABASE_URL + SESSION_SECRET_PEPPER set):
 *   npx ts-node --project tsconfig.json scripts/seed-sprint41-validation.ts
 *   npx ts-node --project tsconfig.json scripts/seed-sprint41-validation.ts --cleanup
 *   npm run seed:sprint41-validation
 *
 * Safety:
 *   - Stable IDs only with prefix `s41val_`
 *   - Aborts if NODE_ENV=production, PHOTO_STORAGE_DRIVER=s3, or DATABASE_URL looks non-local
 *   - Photos written to local PHOTO_UPLOAD_DIR only
 *
 * Creates:
 *   - Viewer A (male→female) + 10 female candidates + MatchListRank (2 HIGH / 4 GOOD / 4 OTHER)
 *   - Viewer B (female→male) + 10 male candidates + same tier mix
 *   - APPROVED local placeholder photos for all profiles
 *   - Fixed session tokens for cookie auth (no Google OAuth)
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
  ALL_PROFILE_IDS,
  ALL_USER_IDS,
  CANDIDATES_FOR_VIEWER_A,
  CANDIDATES_FOR_VIEWER_B,
  EVAL_VERSION,
  S41_PREFIX,
  VIEWER_A,
  VIEWER_B,
  type S41CandidateDef,
} from './sprint41-validation-fixtures';
import { assertSprint41ValidationSafeEnvironment } from './sprint41-validation-safety';

dotenv.config();

const prisma = new PrismaClient();

// ── Session / photos ─────────────────────────────────────────────────────────

function hashSessionToken(rawToken: string, pepper: string): string {
  return createHash('sha256')
    .update(rawToken, 'utf8')
    .update(pepper, 'utf8')
    .digest('hex');
}

// ── Tiny solid PNG (distinct RGB per profile) ────────────────────────────────

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

/** 48×48 opaque RGB PNG — valid image bytes for local photo serving. */
function solidPng(r: number, g: number, b: number, size = 48): Buffer {
  const row = Buffer.alloc(1 + size * 3);
  const rows: Buffer[] = [];
  for (let y = 0; y < size; y++) {
    row[0] = 0;
    for (let x = 0; x < size; x++) {
      const o = 1 + x * 3;
      // subtle gradient so files are not identical beyond RGB
      const t = (x + y) % 8;
      row[o] = Math.min(255, r + t);
      row[o + 1] = Math.min(255, g + t);
      row[o + 2] = Math.min(255, b + t);
    }
    rows.push(Buffer.from(row));
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = deflateSync(Buffer.concat(rows));
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
      insight: 'Sprint 41 validation fixture.',
      overallNarrative: summary,
      aboutMeInsight: summary,
      relationshipInsight: 'Sprint 41 validation fixture.',
      partnerInsight: 'Sprint 41 validation fixture.',
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

function signalForTier(tier: S41CandidateDef['tier']): number {
  if (tier === 'HIGH') return 8;
  if (tier === 'GOOD') return 6;
  return 3;
}

async function writeLocalPhoto(storageKey: string, bytes: Buffer): Promise<void> {
  const fullPath = resolve(process.cwd(), storageKey);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, bytes);
}

async function upsertApprovedPhoto(opts: {
  photoId: string;
  profileId: string;
  rgb: [number, number, number];
}): Promise<void> {
  const uploadDir = loadPhotoStorageConfig(process.env).uploadDir;
  const storageKey = `${uploadDir.replace(/\\/g, '/')}/${opts.profileId}/${opts.photoId}.png`;
  const bytes = solidPng(opts.rgb[0], opts.rgb[1], opts.rgb[2]);
  await writeLocalPhoto(storageKey, bytes);

  await prisma.userProfilePhoto.upsert({
    where: { id: opts.photoId },
    create: {
      id: opts.photoId,
      profileId: opts.profileId,
      storageKey,
      originalFileName: `${opts.photoId}.png`,
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

async function upsertProfilePerson(opts: {
  userId: string;
  profileId: string;
  email: string;
  googleId: string;
  displayName: string;
  nickname: string;
  gender: ProfileGender;
  desired: ProfileGender[];
  birthDate: string;
  aboutMe: string;
  wantsChildren: string;
  interests: string[];
  city?: string;
  summary: string;
  signalValue: number;
  photoId: string;
  photoRgb: [number, number, number];
}): Promise<void> {
  await prisma.user.upsert({
    where: { id: opts.userId },
    create: {
      id: opts.userId,
      email: opts.email,
      googleId: opts.googleId,
      displayName: opts.displayName,
      status: 'ACTIVE',
    },
    update: { displayName: opts.displayName, email: opts.email },
  });

  await prisma.userProfile.upsert({
    where: { id: opts.profileId },
    create: {
      id: opts.profileId,
      userId: opts.userId,
      name: opts.displayName,
      nickname: opts.nickname,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      onboardingCompletedAt: new Date(),
      gender: opts.gender,
      desiredPartnerGenders: opts.desired,
      birthDate: new Date(`${opts.birthDate}T00:00:00.000Z`),
      aboutMe: opts.aboutMe,
      aboutPartner: 'Looking for a kind, long-term partner.',
      aboutRelationship: 'Serious dating with clear intentions.',
      city: opts.city ?? 'Tel Aviv',
      country: 'IL',
      locationLabel: `${opts.city ?? 'Tel Aviv'}, IL`,
      wantsChildren: opts.wantsChildren,
      interestsTop: opts.interests,
      analyzedAt: new Date(),
      submittedAt: new Date(),
    },
    update: {
      name: opts.displayName,
      nickname: opts.nickname,
      status: UserProfileStatus.ANALYZED,
      onboardingStep: 'COMPLETED',
      gender: opts.gender,
      desiredPartnerGenders: opts.desired,
      birthDate: new Date(`${opts.birthDate}T00:00:00.000Z`),
      aboutMe: opts.aboutMe,
      wantsChildren: opts.wantsChildren,
      interestsTop: opts.interests,
      analyzedAt: new Date(),
      city: opts.city ?? 'Tel Aviv',
      locationLabel: `${opts.city ?? 'Tel Aviv'}, IL`,
    },
  });

  await prisma.userProfilePreference.upsert({
    where: { profileId: opts.profileId },
    create: {
      profileId: opts.profileId,
      acceptedPartnerGenders: opts.desired.map(String),
      partnerAgeMin: 24,
      partnerAgeMax: 40,
    },
    update: {
      acceptedPartnerGenders: opts.desired.map(String),
      partnerAgeMin: 24,
      partnerAgeMax: 40,
    },
  });

  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: opts.profileId },
  });
  await prisma.userProfileEvaluation.create({
    data: {
      profileId: opts.profileId,
      version: EVAL_VERSION,
      evaluationJson: makeEvalJson(
        opts.summary,
        opts.signalValue,
        opts.interests.slice(0, 3),
      ),
    },
  });

  await prisma.userProfileInterest.deleteMany({
    where: { profileId: opts.profileId },
  });
  for (let i = 0; i < opts.interests.length; i++) {
    await prisma.userProfileInterest.create({
      data: {
        profileId: opts.profileId,
        tag: opts.interests[i]!,
        rank: i,
        source: 'sprint41_validation',
        evalVersion: EVAL_VERSION,
      },
    });
  }

  await upsertApprovedPhoto({
    photoId: opts.photoId,
    profileId: opts.profileId,
    rgb: opts.photoRgb,
  });
}

async function upsertSession(
  sessionId: string,
  userId: string,
  rawToken: string,
  pepper: string,
): Promise<void> {
  const sessionTokenHash = hashSessionToken(rawToken, pepper);
  await prisma.userSession.upsert({
    where: { id: sessionId },
    create: {
      id: sessionId,
      userId,
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

async function upsertRank(
  rankId: string,
  viewerUserId: string,
  candidate: S41CandidateDef,
): Promise<void> {
  const builtAt = new Date();
  await prisma.matchListRank.upsert({
    where: {
      viewerUserId_candidateProfileId: {
        viewerUserId,
        candidateProfileId: candidate.profileId,
      },
    },
    create: {
      id: rankId,
      viewerUserId,
      candidateProfileId: candidate.profileId,
      matchScore: candidate.matchScore,
      hardBlocked: false,
      builtAt,
    },
    update: {
      matchScore: candidate.matchScore,
      hardBlocked: false,
      builtAt,
    },
  });
}

async function cleanup(): Promise<void> {
  assertSprint41ValidationSafeEnvironment();
  console.log(`\n── Cleanup Sprint 41 validation (${S41_PREFIX}*) ──`);

  const photos = await prisma.userProfilePhoto.findMany({
    where: { profileId: { in: [...ALL_PROFILE_IDS] } },
    select: { storageKey: true },
  });
  for (const p of photos) {
    await rm(resolve(process.cwd(), p.storageKey), { force: true }).catch(() => undefined);
  }

  await prisma.matchListRank.deleteMany({
    where: { viewerUserId: { in: [VIEWER_A.userId, VIEWER_B.userId] } },
  });
  await prisma.matchAction.deleteMany({
    where: {
      OR: [
        { actorUserId: { in: [...ALL_USER_IDS] } },
        { targetUserId: { in: [...ALL_USER_IDS] } },
      ],
    },
  });
  await prisma.userProfilePhoto.deleteMany({
    where: { profileId: { in: [...ALL_PROFILE_IDS] } },
  });
  await prisma.userProfileInterest.deleteMany({
    where: { profileId: { in: [...ALL_PROFILE_IDS] } },
  });
  await prisma.userProfileSignal.deleteMany({
    where: { profileId: { in: [...ALL_PROFILE_IDS] } },
  });
  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: { in: [...ALL_PROFILE_IDS] } },
  });
  await prisma.userProfilePreference.deleteMany({
    where: { profileId: { in: [...ALL_PROFILE_IDS] } },
  });
  await prisma.userSession.deleteMany({
    where: { userId: { in: [VIEWER_A.userId, VIEWER_B.userId] } },
  });
  await prisma.userProfile.deleteMany({
    where: { id: { in: [...ALL_PROFILE_IDS] } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: [...ALL_USER_IDS] } },
  });

  console.log(`cleaned ${ALL_PROFILE_IDS.length} profiles / ${ALL_USER_IDS.length} users`);
}

async function seed(): Promise<void> {
  assertSprint41ValidationSafeEnvironment();

  const pepper = process.env.SESSION_SECRET_PEPPER ?? '';
  if (!pepper) {
    throw new Error('SESSION_SECRET_PEPPER not set in .env');
  }

  console.log('\n── Seeding Sprint 41 validation fixtures ──');

  await upsertProfilePerson({
    userId: VIEWER_A.userId,
    profileId: VIEWER_A.profileId,
    email: VIEWER_A.email,
    googleId: `google_${VIEWER_A.userId}`,
    displayName: VIEWER_A.name,
    nickname: VIEWER_A.nickname,
    gender: ProfileGender.MALE,
    desired: [ProfileGender.FEMALE],
    birthDate: VIEWER_A.birthDate,
    aboutMe: VIEWER_A.aboutMe,
    wantsChildren: VIEWER_A.wantsChildren,
    interests: [...VIEWER_A.interests],
    summary: 'Ambitious, warm viewer aligned on kids and growth.',
    signalValue: 8,
    photoId: 's41val_photo_viewer_a',
    photoRgb: [50, 90, 160],
  });
  await upsertSession(
    VIEWER_A.sessionId,
    VIEWER_A.userId,
    VIEWER_A.rawSessionToken,
    pepper,
  );

  await upsertProfilePerson({
    userId: VIEWER_B.userId,
    profileId: VIEWER_B.profileId,
    email: VIEWER_B.email,
    googleId: `google_${VIEWER_B.userId}`,
    displayName: VIEWER_B.name,
    nickname: VIEWER_B.nickname,
    gender: ProfileGender.FEMALE,
    desired: [ProfileGender.MALE],
    birthDate: VIEWER_B.birthDate,
    aboutMe: VIEWER_B.aboutMe,
    wantsChildren: VIEWER_B.wantsChildren,
    interests: [...VIEWER_B.interests],
    summary: 'Creative viewer who wants kids and emotional honesty.',
    signalValue: 8,
    photoId: 's41val_photo_viewer_b',
    photoRgb: [180, 80, 120],
  });
  await upsertSession(
    VIEWER_B.sessionId,
    VIEWER_B.userId,
    VIEWER_B.rawSessionToken,
    pepper,
  );

  for (const c of CANDIDATES_FOR_VIEWER_A) {
    await upsertProfilePerson({
      userId: c.userId,
      profileId: c.profileId,
      email: c.email,
      googleId: `google_${c.userId}`,
      displayName: c.name,
      nickname: c.nickname,
      gender: ProfileGender.FEMALE,
      desired: [ProfileGender.MALE],
      birthDate: c.birthDate,
      aboutMe: c.aboutMe,
      wantsChildren: c.wantsChildren,
      interests: c.interests,
      summary: c.aboutMe,
      signalValue: signalForTier(c.tier),
      photoId: c.photoId,
      photoRgb: c.photoRgb,
    });
    await upsertRank(c.rankId, VIEWER_A.userId, c);
    console.log(`  ✓ ${c.name} (${c.tier} ${c.matchScore})`);
  }

  for (const c of CANDIDATES_FOR_VIEWER_B) {
    await upsertProfilePerson({
      userId: c.userId,
      profileId: c.profileId,
      email: c.email,
      googleId: `google_${c.userId}`,
      displayName: c.name,
      nickname: c.nickname,
      gender: ProfileGender.MALE,
      desired: [ProfileGender.FEMALE],
      birthDate: c.birthDate,
      aboutMe: c.aboutMe,
      wantsChildren: c.wantsChildren,
      interests: c.interests,
      summary: c.aboutMe,
      signalValue: signalForTier(c.tier),
      photoId: c.photoId,
      photoRgb: c.photoRgb,
    });
    await upsertRank(c.rankId, VIEWER_B.userId, c);
    console.log(`  ✓ ${c.name} (${c.tier} ${c.matchScore})`);
  }

  console.log('\n✓ Seed complete.\n');
  console.log('Viewer A cookie (dating_session):');
  console.log(`  ${VIEWER_A.rawSessionToken}`);
  console.log('Viewer B cookie (dating_session):');
  console.log(`  ${VIEWER_B.rawSessionToken}`);
  console.log('\nPrimary protocol: log in as Viewer A → /dating/me-matches');
  console.log('Expected tiers (Viewer A ranks): HIGH 2 / GOOD 4 / OTHER 4');
  console.log('\nVerify:');
  console.log('  npm run verify:sprint41-validation');
  console.log('\nAnalytics during sessions: DevTools console → filter `match.`');
  console.log('  (match.card_viewed, match.priority_section_viewed/expanded)\n');
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
