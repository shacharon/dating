import { NotFoundException } from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import { MeProfileMatchesService } from './me-profile-matches.service';

const S_ANALYZED = 'ANALYZED' as UserProfileStatus;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProfileRow(overrides: {
  id: string;
  userId: string;
  gender?: string | null;
  desiredPartnerGenders?: unknown;
  evaluationCount?: number;
}) {
  return {
    id: overrides.id,
    userId: overrides.userId,
    status: S_ANALYZED,
    birthDate: new Date('1990-06-15T00:00:00.000Z'),
    gender: (overrides.gender ?? null) as string | null,
    desiredPartnerGenders: overrides.desiredPartnerGenders ?? null,
    city: 'TLV',
    country: 'IL',
    locationLabel: 'Tel Aviv, IL',
    aboutMe: 'About me text',
    aboutPartner: 'About partner text',
    aboutRelationship: 'About relationship text',
    analyzedAt: new Date('2026-04-01T10:00:00.000Z'),
    _count: { evaluations: overrides.evaluationCount ?? 1 },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MeProfileMatchesService', () => {
  const viewerUserId = 'user_viewer';
  const viewerProfileId = 'prof_viewer';

  let prisma: {
    userProfile: { findUnique: jest.Mock; findMany: jest.Mock };
  };
  let obs: jest.Mocked<Pick<StructuredObservabilityService, 'trace' | 'error'>>;
  let service: MeProfileMatchesService;

  beforeEach(() => {
    prisma = {
      userProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    obs = { trace: jest.fn(), error: jest.fn() };
    service = new MeProfileMatchesService(
      prisma as unknown as PrismaService,
      obs as unknown as StructuredObservabilityService,
    );
  });

  // ── No profile ──────────────────────────────────────────────────────────────

  it('throws NotFoundException when viewer has no UserProfile', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(null);
    await expect(service.getMatchesForUser(viewerUserId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  // ── No candidates ───────────────────────────────────────────────────────────

  it('returns empty candidates when no other analyzed profiles exist', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    prisma.userProfile.findMany.mockResolvedValue([]);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.viewerProfileId).toBe(viewerProfileId);
    expect(result.viewerGender).toBe('MALE');
    expect(result.viewerAcceptedPartnerGenders).toEqual(['FEMALE']);
    expect(result.totalCandidatesBeforeFilter).toBe(0);
    expect(result.candidates).toHaveLength(0);
  });

  // ── Gender filter: mismatch excluded ────────────────────────────────────────

  it('excludes candidate whose gender is not in viewer desiredPartnerGenders', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    // Candidate is MALE — viewer wants FEMALE only
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'prof_candidate_1', userId: 'user_c1', gender: 'MALE', desiredPartnerGenders: null }),
    ]);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.totalCandidatesBeforeFilter).toBe(1);
    expect(result.candidates).toHaveLength(0);
  });

  // ── Gender filter: match included ───────────────────────────────────────────

  it('includes candidate whose gender matches viewer desiredPartnerGenders (one-direction pass)', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    // Candidate is FEMALE with no gender filter — passes both directions
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'prof_candidate_2', userId: 'user_c2', gender: 'FEMALE', desiredPartnerGenders: null }),
    ]);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0].userProfileId).toBe('prof_candidate_2');
    expect(result.candidates[0].gender).toBe('FEMALE');
    expect(result.candidates[0].hasEvaluation).toBe(true);
  });

  // ── Reciprocal filter: candidate rejects viewer ──────────────────────────────

  it('excludes candidate whose desiredPartnerGenders does not include the viewer gender', async () => {
    // Viewer is MALE, wants FEMALE
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    // Candidate is FEMALE but wants FEMALE (not MALE) — reverse direction fails
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'prof_candidate_3', userId: 'user_c3', gender: 'FEMALE', desiredPartnerGenders: ['FEMALE'] }),
    ]);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.totalCandidatesBeforeFilter).toBe(1);
    expect(result.candidates).toHaveLength(0);
  });

  // ── No gender filter = free pass ─────────────────────────────────────────────

  it('includes candidates when viewer has no desiredPartnerGenders set', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: null }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'prof_candidate_4', userId: 'user_c4', gender: 'FEMALE', desiredPartnerGenders: null }),
      makeProfileRow({ id: 'prof_candidate_5', userId: 'user_c5', gender: 'MALE', desiredPartnerGenders: null }),
    ]);

    const result = await service.getMatchesForUser(viewerUserId);

    // No gender filter from either party — all pass
    expect(result.candidates).toHaveLength(2);
    expect(result.viewerAcceptedPartnerGenders).toBeNull();
  });

  // ── hasEvaluation flag ───────────────────────────────────────────────────────

  it('reports hasEvaluation=false when candidate has no evaluation rows', async () => {
    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId }),
    );
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: 'prof_candidate_6', userId: 'user_c6', evaluationCount: 0 }),
    ]);

    const result = await service.getMatchesForUser(viewerUserId);

    expect(result.candidates[0].hasEvaluation).toBe(false);
  });

  // ─── Runtime call contract — proxy trap ──────────────────────────────────────
  //
  // Mounts a Proxy on every legacy Prisma table so that any property access
  // throws LEGACY_TABLE_ACCESSED immediately. getMatchesForUser() must complete
  // without ever touching a legacy delegate.
  //
  // Proven by: runtime call — if a legacy table is accessed, the proxy throws
  // and the test fails before the assertion is ever reached.
  describe('no legacy table reads — runtime call contract (proxy trap)', () => {
    const LEGACY_TABLES = [
      'matchmakingProfile',
      'profileExtractionV2',
      'profileEvaluationRaw',
      'profileEvaluation',
    ] as const;

    function mountLegacyTraps() {
      for (const table of LEGACY_TABLES) {
        (prisma as Record<string, unknown>)[table] = new Proxy(
          {},
          {
            get(_target, prop) {
              throw new Error(
                `LEGACY_TABLE_ACCESSED: ${table}.${String(prop)} must never be read from the active me-profile/matches path`,
              );
            },
          },
        );
      }
    }

    it('getMatchesForUser() completes the full happy path without accessing any legacy table', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: 'prof_cand', userId: 'user_c', gender: 'FEMALE', desiredPartnerGenders: null }),
      ]);

      await expect(service.getMatchesForUser(viewerUserId)).resolves.toBeDefined();
    });

    it('getMatchesForUser() returns not-found without accessing any legacy table when viewer has no profile', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.getMatchesForUser(viewerUserId)).rejects.toBeInstanceOf(
        require('@nestjs/common').NotFoundException,
      );
    });

    it('getMatchesForUser() returns empty candidates without accessing any legacy table when no candidates exist', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      const result = await service.getMatchesForUser(viewerUserId);
      expect(result.candidates).toHaveLength(0);
    });
  });

  // ─── Static isolation contract — no legacy delegates in Prisma mock ───────────
  //
  // Constructs a Prisma mock that contains ONLY the new-model table delegates
  // (userProfile, userProfileEvaluation). Legacy table properties are entirely
  // absent — not even as null — so any runtime access throws TypeError
  // ("Cannot read properties of undefined").
  //
  // Proven by: static structure — if getMatchesForUser() tried to reach
  // prisma.matchmakingProfile (or any other legacy delegate), JavaScript would
  // throw a TypeError and the test would fail. The test passing proves the
  // service does not reference any legacy table at runtime.
  describe('static isolation contract — Prisma mock contains only new-model delegates', () => {
    it('getMatchesForUser() succeeds with a Prisma mock that has no legacy table delegates', async () => {
      const newModelOnlyPrisma = {
        // Only new-model tables — no matchmakingProfile, profileExtractionV2, etc.
        userProfile: {
          findUnique: jest.fn().mockResolvedValue(
            makeProfileRow({
              id: viewerProfileId,
              userId: viewerUserId,
              gender: 'MALE',
              desiredPartnerGenders: ['FEMALE'],
            }),
          ),
          findMany: jest.fn().mockResolvedValue([
            makeProfileRow({ id: 'prof_cand', userId: 'user_c', gender: 'FEMALE', desiredPartnerGenders: null }),
          ]),
        },
        // userProfileEvaluation omitted intentionally — MeProfileMatchesService
        // does not query it (only MeMatchesService does for scoring).
      };

      const isolatedService = new MeProfileMatchesService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
      );

      const result = await isolatedService.getMatchesForUser(viewerUserId);

      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0].userProfileId).toBe('prof_cand');
    });

    it('getMatchesForUser() returns empty candidates with no-legacy mock when no analyzed profiles exist', async () => {
      const newModelOnlyPrisma = {
        userProfile: {
          findUnique: jest.fn().mockResolvedValue(
            makeProfileRow({ id: viewerProfileId, userId: viewerUserId }),
          ),
          findMany: jest.fn().mockResolvedValue([]),
        },
      };

      const isolatedService = new MeProfileMatchesService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
      );

      const result = await isolatedService.getMatchesForUser(viewerUserId);
      expect(result.candidates).toHaveLength(0);
      // Proves: legacy tables are not needed even when the candidate pool is empty.
    });
  });
});
