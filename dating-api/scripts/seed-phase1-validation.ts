/**
 * Phase 1 manual validation seed.
 *
 * Creates:
 *  - 1 viewer User + UserProfile (ANALYZED) + UserProfileEvaluation + UserSession
 *  - 1 strong-match candidate (signals ≈ viewer's → expect matchScore ≥ 75)
 *  - 1 weak-match  candidate (signals opposite to viewer → expect matchScore ≤ 30)
 *
 * Run:
 *   npx ts-node --project tsconfig.json scripts/seed-phase1-validation.ts
 *
 * Output: raw session token + profile IDs for PowerShell validation calls.
 *
 * Safe to re-run: uses fixed IDs with upsert; re-running resets the data.
 */

import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

// ── Fixed stable IDs (safe to re-run / delete manually) ─────────────────────

const VIEWER_USER_ID     = 'val_p1_user_viewer';
const VIEWER_PROFILE_ID  = 'val_p1_prof_viewer';
const VIEWER_SESSION_ID  = 'val_p1_sess_viewer';

const STRONG_USER_ID     = 'val_p1_user_strong';
const STRONG_PROFILE_ID  = 'val_p1_prof_strong';

const WEAK_USER_ID       = 'val_p1_user_weak';
const WEAK_PROFILE_ID    = 'val_p1_prof_weak';

// Fixed raw token — this is what you put in the dating_session cookie.
const RAW_SESSION_TOKEN  = 'val-p1-viewer-session-token-fixed-01';

// ── Session token hashing (matches session-token.crypto.ts) ─────────────────

function hashSessionToken(rawToken: string, pepper: string): string {
  return createHash('sha256')
    .update(rawToken, 'utf8')
    .update(pepper, 'utf8')
    .digest('hex');
}

// ── Minimal EvaluateBatchResult helpers ──────────────────────────────────────

/** Build a minimal self-signals block for the engine. */
function makeSignals(value: number) {
  return {
    ambition:                value,
    socialBattery:           value,
    healthBodyConsciousness: value,
    emotionalDepth:          value,
    attachmentSecurity:      value,
    directness:              value,
    independence:            value,
    traditionalism:          value,
    financialMindset:        value,
    relationshipClarity:     value,
    spirituality:            value,
    lifestylePace:           value,
    physicalPriority:        value,
    statusOrientation:       value,
    // shadow signals (not used in scoring but stored)
    intellectualCuriosity:   value,
    conflictStyle:           value,
    noveltyVsRoutine:        value,
    structureChaosTolerance: value,
  };
}

function makeEvalJson(signals: Record<string, number>, summary: string) {
  return {
    self: {
      signals,
      confidence: 0.9,
      qualityStatus: 'OK',
    },
    partner: {
      signals: {},
      confidence: 0.5,
      qualityStatus: 'OK',
    },
    relationship: {
      signals: {},
      confidence: 0.5,
      qualityStatus: 'OK',
    },
    compatibility: {
      selfVsPartner: {
        overallScore: 0,
        coverage: 0,
        matchedSignals: 0,
        hardMismatches: [],
        breakdown: [],
      },
      selfVsRelationship: {
        overallScore: 0,
        coverage: 0,
        matchedSignals: 0,
        hardMismatches: [],
        breakdown: [],
      },
    },
    display: {
      summary,
      insight: 'Validation seed profile.',
    },
    productScores: {},
    productScoresPresentation: {},
    flags: [],
  };
}

// ── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  const pepper = process.env['SESSION_SECRET_PEPPER'] ?? '';
  if (!pepper) {
    throw new Error('SESSION_SECRET_PEPPER not set in .env');
  }

  const sessionTokenHash = hashSessionToken(RAW_SESSION_TOKEN, pepper);

  console.log('\n── Seeding Phase 1 validation data ─────────────────────────');

  // ── Viewer ──────────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { id: VIEWER_USER_ID },
    create: {
      id: VIEWER_USER_ID,
      email: 'val-viewer@bondit-test.local',
      googleId: 'google_val_p1_viewer',
      displayName: 'Val Viewer',
      status: 'ACTIVE',
    },
    update: { displayName: 'Val Viewer' },
  });

  await prisma.userProfile.upsert({
    where: { id: VIEWER_PROFILE_ID },
    create: {
      id: VIEWER_PROFILE_ID,
      userId: VIEWER_USER_ID,
      name: 'Val Viewer',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      gender: 'FEMALE',
      desiredPartnerGenders: ['MALE'],
      birthDate: new Date('1992-04-10T00:00:00.000Z'),
      aboutMe: 'Validation viewer profile. Ambitious, emotionally aware.',
      aboutPartner: 'Looking for a grounded, warm partner.',
      aboutRelationship: 'Long-term, deep connection.',
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      analyzedAt: new Date(),
    },
    update: { status: 'ANALYZED', analyzedAt: new Date() },
  });

  // Delete existing evaluations for viewer to keep it clean on re-run.
  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: VIEWER_PROFILE_ID },
  });
  await prisma.userProfileEvaluation.create({
    data: {
      profileId: VIEWER_PROFILE_ID,
      version: 'val-p1',
      evaluationJson: makeEvalJson(
        makeSignals(7),
        'A thoughtful, balanced individual with a clear sense of direction.',
      ),
    },
  });

  // Session for viewer
  await prisma.userSession.upsert({
    where: { id: VIEWER_SESSION_ID },
    create: {
      id: VIEWER_SESSION_ID,
      userId: VIEWER_USER_ID,
      sessionTokenHash,
      expiresAt: new Date(Date.now() + 14 * 86_400_000), // 14 days
    },
    update: {
      sessionTokenHash,
      expiresAt: new Date(Date.now() + 14 * 86_400_000),
      revokedAt: null,
    },
  });

  // ── Strong match candidate (signals = 7 → identical to viewer → score ≥ 75) ─

  await prisma.user.upsert({
    where: { id: STRONG_USER_ID },
    create: {
      id: STRONG_USER_ID,
      email: 'val-strong@bondit-test.local',
      googleId: 'google_val_p1_strong',
      displayName: 'Val Strong',
      status: 'ACTIVE',
    },
    update: { displayName: 'Val Strong' },
  });

  await prisma.userProfile.upsert({
    where: { id: STRONG_PROFILE_ID },
    create: {
      id: STRONG_PROFILE_ID,
      userId: STRONG_USER_ID,
      name: 'Val Strong',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      birthDate: new Date('1990-08-22T00:00:00.000Z'),
      aboutMe: 'Validation strong-match profile. Same signals as viewer.',
      aboutPartner: 'Open to a genuine, stable relationship.',
      aboutRelationship: 'Looking for a meaningful long-term partner.',
      city: 'Tel Aviv',
      country: 'IL',
      locationLabel: 'Tel Aviv, IL',
      analyzedAt: new Date(),
    },
    update: { status: 'ANALYZED', analyzedAt: new Date() },
  });

  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: STRONG_PROFILE_ID },
  });
  await prisma.userProfileEvaluation.create({
    data: {
      profileId: STRONG_PROFILE_ID,
      version: 'val-p1',
      // signals identical to viewer (7) → engine should score this pair very high
      evaluationJson: makeEvalJson(
        makeSignals(7),
        'Warm, stable, and deeply aligned with similar values.',
      ),
    },
  });

  // ── Weak match candidate (signals = 1 → opposite to viewer → score ≤ 30) ──

  await prisma.user.upsert({
    where: { id: WEAK_USER_ID },
    create: {
      id: WEAK_USER_ID,
      email: 'val-weak@bondit-test.local',
      googleId: 'google_val_p1_weak',
      displayName: 'Val Weak',
      status: 'ACTIVE',
    },
    update: { displayName: 'Val Weak' },
  });

  await prisma.userProfile.upsert({
    where: { id: WEAK_PROFILE_ID },
    create: {
      id: WEAK_PROFILE_ID,
      userId: WEAK_USER_ID,
      name: 'Val Weak',
      status: 'ANALYZED',
      onboardingStep: 'COMPLETED',
      gender: 'MALE',
      desiredPartnerGenders: ['FEMALE'],
      birthDate: new Date('1991-03-14T00:00:00.000Z'),
      aboutMe: 'Validation weak-match profile. Opposite signals to viewer.',
      aboutPartner: 'Very different values and lifestyle.',
      aboutRelationship: 'Casual only.',
      city: 'Haifa',
      country: 'IL',
      locationLabel: 'Haifa, IL',
      analyzedAt: new Date(),
    },
    update: { status: 'ANALYZED', analyzedAt: new Date() },
  });

  await prisma.userProfileEvaluation.deleteMany({
    where: { profileId: WEAK_PROFILE_ID },
  });
  await prisma.userProfileEvaluation.create({
    data: {
      profileId: WEAK_PROFILE_ID,
      version: 'val-p1',
      // signals all at 1 (gap=6 vs viewer's 7) → engine scores this pair low
      evaluationJson: makeEvalJson(
        makeSignals(1),
        'A very different personality with contrasting values and lifestyle.',
      ),
    },
  });

  // ── Summary ─────────────────────────────────────────────────────────────

  console.log('\n✓ Seed complete.\n');
  console.log('SESSION COOKIE VALUE (copy this exactly):');
  console.log(`  ${RAW_SESSION_TOKEN}\n`);
  console.log('PROFILE IDs:');
  console.log(`  viewer  : ${VIEWER_PROFILE_ID}`);
  console.log(`  strong  : ${STRONG_PROFILE_ID}`);
  console.log(`  weak    : ${WEAK_PROFILE_ID}`);
  console.log('\nExpected matchScore ranges:');
  console.log('  strong candidate : >= 75  (identical signals to viewer)');
  console.log('  weak   candidate : <= 30  (signals=1 vs viewer=7, gap=6)');
  console.log('');
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
