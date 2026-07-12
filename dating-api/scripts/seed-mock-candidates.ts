/**
 * Seed 2 mock ANALYZED candidates compatible with the current viewer.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/seed-mock-candidates.ts [viewerUserId]
 *
 * If viewerUserId is omitted the script picks the first ANALYZED UserProfile.
 * Creates 2 fake User + UserProfile (ANALYZED) + UserProfileEvaluation rows.
 * Safe to re-run: uses upsert / idempotent IDs.
 */

import { PrismaClient, ProfileGender, UserProfileStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── synthetic evaluation JSON ────────────────────────────────────────────────

function makeEvalJson(
  label: 'strong' | 'weak',
  gender: string,
): Record<string, unknown> {
  const signalValue = label === 'strong' ? 7.5 : 2.0;
  const signals: Record<string, unknown> = {};
  const signalKeys = [
    'ambition',
    'socialBattery',
    'healthBodyConsciousness',
    'emotionalDepth',
    'attachmentSecurity',
    'directness',
    'independence',
    'traditionalism',
    'financialMindset',
    'relationshipClarity',
    'spirituality',
    'lifestylePace',
    'physicalPriority',
    'statusOrientation',
  ];
  for (const k of signalKeys) {
    signals[k] = { selfScore: signalValue, partnerScore: signalValue, weight: 1.0 };
  }
  return {
    signals,
    display: {
      summary: label === 'strong'
        ? `A highly compatible ${gender} with strong alignment across values and lifestyle.`
        : `A ${gender} profile with lower compatibility — different life rhythms.`,
    },
    meta: { version: 'mock-v1', label },
  };
}

// ─── gender helpers ────────────────────────────────────────────────────────────

/** Given a viewer gender, pick an opposite/compatible candidate gender. */
function pickCandidateGender(viewerGender: string | null): ProfileGender {
  if (viewerGender === 'MALE') return ProfileGender.FEMALE;
  if (viewerGender === 'FEMALE') return ProfileGender.MALE;
  return ProfileGender.MALE; // fallback
}

// ─── cuid-like stable IDs ─────────────────────────────────────────────────────

const STRONG_USER_ID = 'mock_strong_user_001';
const STRONG_PROFILE_ID = 'mock_strong_profile_001';
const WEAK_USER_ID = 'mock_weak_user_001';
const WEAK_PROFILE_ID = 'mock_weak_profile_001';

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const viewerUserId = process.argv[2] ?? undefined;

  // Find the viewer profile.
  const viewer = viewerUserId
    ? await prisma.userProfile.findUnique({ where: { userId: viewerUserId } })
    : await prisma.userProfile.findFirst({
        where: { status: UserProfileStatus.ANALYZED },
        orderBy: { createdAt: 'asc' },
      });

  if (!viewer) {
    console.error('No ANALYZED UserProfile found. Run the app, create + analyze a profile first.');
    process.exit(1);
  }

  console.log(`Viewer profileId=${viewer.id} gender=${viewer.gender ?? 'null'}`);

  const viewerGender = viewer.gender as ProfileGender | null;
  const candidateGender: ProfileGender = pickCandidateGender(viewerGender);

  // Determine what genders the viewer accepts (desiredPartnerGenders JSON field).
  const viewerDesired: ProfileGender[] = (() => {
    const raw = viewer.desiredPartnerGenders;
    if (Array.isArray(raw) && raw.length > 0) return raw as ProfileGender[];
    return [candidateGender]; // fallback: treat viewer as accepting opposite
  })();

  console.log(`Viewer accepts: ${viewerDesired.join(', ')}`);
  console.log(`Candidate gender: ${candidateGender}, accepts viewer gender: ${viewerGender ?? 'any'}`);

  // ── strong candidate ─────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { id: STRONG_USER_ID },
    create: {
      id: STRONG_USER_ID,
      email: 'mock.strong@seed.local',
      googleId: 'mock_google_strong_001',
      displayName: 'Mock Strong',
    },
    update: {},
  });

  const strongBirth = new Date('1993-06-15');
  await prisma.userProfile.upsert({
    where: { id: STRONG_PROFILE_ID },
    create: {
      id: STRONG_PROFILE_ID,
      userId: STRONG_USER_ID,
      status: UserProfileStatus.ANALYZED,
      gender: candidateGender,
      desiredPartnerGenders: viewerGender ? [viewerGender] : [],
      birthDate: strongBirth,
      locationLabel: 'Tel Aviv',
      city: 'Tel Aviv',
      country: 'Israel',
      aboutMe: 'Mock strong candidate - high signal alignment.',
      aboutPartner: 'Looking for someone aligned on values.',
      analyzedAt: new Date(),
    },
    update: {
      status: UserProfileStatus.ANALYZED,
      gender: candidateGender,
      desiredPartnerGenders: viewerGender ? [viewerGender] : [],
      analyzedAt: new Date(),
    },
  });

  // Delete any stale evaluations for idempotency.
  await prisma.userProfileEvaluation.deleteMany({ where: { profileId: STRONG_PROFILE_ID } });
  const strongEval = await prisma.userProfileEvaluation.create({
    data: {
      profileId: STRONG_PROFILE_ID,
      version: 'mock-v1',
      evaluationJson: makeEvalJson('strong', candidateGender) as never,
    },
  });

  console.log(`✓ Strong candidate profileId=${STRONG_PROFILE_ID} evalId=${strongEval.id}`);

  // ── weak candidate ───────────────────────────────────────────────────────────

  await prisma.user.upsert({
    where: { id: WEAK_USER_ID },
    create: {
      id: WEAK_USER_ID,
      email: 'mock.weak@seed.local',
      googleId: 'mock_google_weak_001',
      displayName: 'Mock Weak',
    },
    update: {},
  });

  const weakBirth = new Date('1990-03-20');
  await prisma.userProfile.upsert({
    where: { id: WEAK_PROFILE_ID },
    create: {
      id: WEAK_PROFILE_ID,
      userId: WEAK_USER_ID,
      status: UserProfileStatus.ANALYZED,
      gender: candidateGender,
      desiredPartnerGenders: viewerGender ? [viewerGender] : [],
      birthDate: weakBirth,
      locationLabel: 'Jerusalem',
      city: 'Jerusalem',
      country: 'Israel',
      aboutMe: 'Mock weak candidate - low signal alignment.',
      aboutPartner: 'Very different preferences.',
      analyzedAt: new Date(),
    },
    update: {
      status: UserProfileStatus.ANALYZED,
      gender: candidateGender,
      desiredPartnerGenders: viewerGender ? [viewerGender] : [],
      analyzedAt: new Date(),
    },
  });

  await prisma.userProfileEvaluation.deleteMany({ where: { profileId: WEAK_PROFILE_ID } });
  const weakEval = await prisma.userProfileEvaluation.create({
    data: {
      profileId: WEAK_PROFILE_ID,
      version: 'mock-v1',
      evaluationJson: makeEvalJson('weak', candidateGender) as never,
    },
  });

  console.log(`✓ Weak candidate profileId=${WEAK_PROFILE_ID} evalId=${weakEval.id}`);

  console.log('\nDone. Hit GET /api/v1/me/matches — expect 2 matches.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
