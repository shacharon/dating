import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import type { UserProfileStatus } from '@prisma/client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import * as holyGrailPair from '../matches/holy-grail-pair-directions';
import * as matchEngine from '../matches/match-engine';
import { buildMeMatchesParticipantReadModel } from './me-profile-engine.mapper';
import { MeMatchesService } from './me-matches.service';

const S_ANALYZED = 'ANALYZED' as UserProfileStatus;
const S_DRAFT = 'DRAFT' as UserProfileStatus;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Minimal UserProfilePreference fixture for Phase E tests. */
function makePrefRow(overrides: {
  profileId?: string;
  acceptedPartnerSmoking?: string[];
  acceptedPartnerAlcohol?: string[];
  acceptedPartnerGenders?: string[];
  acceptedPartnerReligions?: string[];
  partnerAgeMin?: number | null;
  partnerAgeMax?: number | null;
  maxDistanceKm?: number | null;
  minimumPartnerEducation?: string | null;
  partnerWantsChildren?: string | null;
  partnerHasChildren?: string | null;
  similarityPreference?: string | null;
} = {}) {
  return {
    id: 'pref_' + (overrides.profileId ?? 'x'),
    profileId: overrides.profileId ?? 'prof_x',
    partnerAgeMin: overrides.partnerAgeMin ?? null,
    partnerAgeMax: overrides.partnerAgeMax ?? null,
    maxDistanceKm: overrides.maxDistanceKm ?? null,
    minimumPartnerEducation: overrides.minimumPartnerEducation ?? null,
    acceptedPartnerGenders: (overrides.acceptedPartnerGenders ?? []) as string[],
    acceptedPartnerSmoking: (overrides.acceptedPartnerSmoking ?? []) as string[],
    acceptedPartnerAlcohol: (overrides.acceptedPartnerAlcohol ?? []) as string[],
    acceptedPartnerReligions: (overrides.acceptedPartnerReligions ?? []) as string[],
    partnerWantsChildren: overrides.partnerWantsChildren ?? null,
    partnerHasChildren: overrides.partnerHasChildren ?? null,
    similarityPreference: overrides.similarityPreference ?? null,
    updatedAt: new Date('2026-04-01T10:00:00.000Z'),
  };
}

function makeProfileRow(overrides: {
  id: string;
  userId: string;
  status?: UserProfileStatus;
  gender?: string | null;
  desiredPartnerGenders?: unknown;
  evaluationCount?: number;
  wantsChildren?: string | null;
  smokingFrequency?: string | null;
  alcoholUse?: string | null;
  /** Joined `UserProfilePreference` row (Phase F: HG prefs live here only). */
  preference?: ReturnType<typeof makePrefRow> | null;
}) {
  return {
    id: overrides.id,
    userId: overrides.userId,
    name: `Profile ${overrides.id}`,
    status: overrides.status ?? S_ANALYZED,
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
    childrenStatus: null as string | null,
    wantsChildren: (overrides.wantsChildren ?? null) as string | null,
    smokingFrequency: (overrides.smokingFrequency ?? null) as string | null,
    alcoholUse: (overrides.alcoholUse ?? null) as string | null,
    education: null as string | null,
    religion: null as string | null,
    preference: overrides.preference !== undefined ? overrides.preference : null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('MeMatchesService', () => {
  const viewerUserId = 'user_viewer';
  const viewerProfileId = 'prof_viewer';
  const candidateProfileId = 'prof_cand_1';

  let prisma: {
    userProfile: { findUnique: jest.Mock; findMany: jest.Mock };
    userProfileEvaluation: { findFirst: jest.Mock };
  };

  /** Default latest eval for any profile id (ORDER BY createdAt DESC LIMIT 1 contract). */
  function defaultLatestEval(profileId: string) {
    return {
      id: `eval_${profileId}`,
      profileId,
      version: 'v1',
      evaluationJson: {
        self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
        partner: { signals: {} },
        relationship: { signals: {} },
      },
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    };
  }
  let obs: jest.Mocked<Pick<StructuredObservabilityService, 'trace' | 'error'>>;
  let service: MeMatchesService;

  beforeEach(() => {
    prisma = {
      userProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      userProfileEvaluation: {
        findFirst: jest
          .fn()
          .mockImplementation(
            ({ where: { profileId } }: { where: { profileId: string } }) =>
              Promise.resolve(defaultLatestEval(profileId)),
          ),
      },
    };
    obs = { trace: jest.fn(), error: jest.fn() };
    service = new MeMatchesService(
      prisma as unknown as PrismaService,
      obs as unknown as StructuredObservabilityService,
    );
  });

  // ─── list() ───────────────────────────────────────────────────────────────

  describe('list()', () => {
    it('returns not_ready(no_profile) when viewer has no UserProfile', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('no_profile');
    });

    it('returns not_ready(not_analyzed) when viewer profile is DRAFT', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId, status: S_DRAFT }),
      );

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('not_analyzed');
    });

    it('returns ready with empty matches when no candidates exist', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(0);
    });

    it('list() throws InternalServerErrorException when viewer has no UserProfileEvaluation row', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(null);
      prisma.userProfile.findMany.mockResolvedValue([]);

      await expect(service.list(viewerUserId)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('list() throws InternalServerErrorException when a candidate has no UserProfileEvaluation row', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE' }),
      ]);
      let call = 0;
      prisma.userProfileEvaluation.findFirst.mockImplementation(() => {
        call += 1;
        if (call === 1) {
          return Promise.resolve({
            evaluationJson: {
              self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
              partner: { signals: {} },
              relationship: { signals: {} },
            },
            createdAt: new Date('2026-04-01T10:00:00.000Z'),
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.list(viewerUserId)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('excludes candidate whose gender is not in viewer desiredPartnerGenders', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      // Candidate is MALE — viewer wants FEMALE only.
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'MALE' }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('me_matches_partner_genders_legacy_json'),
        'ME_MATCHES_PARTNER_GENDER_LEGACY_JSON',
      );
    });

    it('includes candidate when gender filter passes reciprocally', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].id).toBe(candidateProfileId);
    });

    it('list() reads reciprocal partner genders from UserProfilePreference when row exists (not desiredPartnerGenders JSON)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['MALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          preference: makePrefRow({
            profileId: candidateProfileId,
            acceptedPartnerGenders: ['MALE'],
          }),
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].id).toBe(candidateProfileId);
      expect(result.viewerAcceptedPartnerGenders).toEqual(['FEMALE']);
    });

    // Requirement 2: no filter when viewer has no desiredPartnerGenders
    it('includes candidate of any gender when viewer has no desiredPartnerGenders (null)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'FEMALE',
          desiredPartnerGenders: null,
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'MALE' }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].id).toBe(candidateProfileId);
    });

    it('includes candidate of any gender when viewer has empty desiredPartnerGenders ([])', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'FEMALE',
          desiredPartnerGenders: [],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'NON_BINARY' }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
    });

    // Requirement 3: OTHER gender is fully supported as both a filter value and a candidate identity
    it('includes gender=OTHER candidate when viewer desiredPartnerGenders includes OTHER', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'FEMALE',
          desiredPartnerGenders: ['OTHER'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'OTHER',
          desiredPartnerGenders: null, // candidate has no filter → viewer direction passes
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].id).toBe(candidateProfileId);
    });

    it('excludes gender=MALE candidate when viewer desiredPartnerGenders is [OTHER] only', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'FEMALE',
          desiredPartnerGenders: ['OTHER'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'MALE' }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    // ── Phase 3 Step 4 — focused gender-filter tests ─────────────────────────
    //
    // Each test below proves exactly one requirement from the step-4 spec.
    // Candidate fixtures use explicit id strings so assertions can name them.
    //
    describe('Phase 3 Step 4 — gender-aware candidate filtering', () => {
      // Req 1: viewer wants ['FEMALE'] → only FEMALE candidates reach the list.
      // Three candidates (FEMALE, MALE, NON_BINARY) are loaded; only one passes.
      it('req1: desiredPartnerGenders=[FEMALE] — returns only the FEMALE candidate by id', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        );
        prisma.userProfile.findMany.mockResolvedValue([
          makeProfileRow({ id: 'cand_female', userId: 'u_f',  gender: 'FEMALE',     desiredPartnerGenders: null }),
          makeProfileRow({ id: 'cand_male',   userId: 'u_m',  gender: 'MALE',       desiredPartnerGenders: null }),
          makeProfileRow({ id: 'cand_nb',     userId: 'u_nb', gender: 'NON_BINARY', desiredPartnerGenders: null }),
        ]);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(result.totalCandidatesBeforeFilter).toBe(3);
        expect(result.matches!.map((m) => m.id)).toEqual(['cand_female']);
      });

      // Req 2: viewer wants ['MALE','OTHER'] → MALE and OTHER pass; FEMALE and NON_BINARY do not.
      it('req2: desiredPartnerGenders=[MALE,OTHER] — returns MALE and OTHER candidates, excludes FEMALE and NON_BINARY', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE', 'OTHER'],
          }),
        );
        prisma.userProfile.findMany.mockResolvedValue([
          makeProfileRow({ id: 'cand_male',   userId: 'u_m',  gender: 'MALE',       desiredPartnerGenders: null }),
          makeProfileRow({ id: 'cand_other',  userId: 'u_o',  gender: 'OTHER',      desiredPartnerGenders: null }),
          makeProfileRow({ id: 'cand_female', userId: 'u_f',  gender: 'FEMALE',     desiredPartnerGenders: null }),
          makeProfileRow({ id: 'cand_nb',     userId: 'u_nb', gender: 'NON_BINARY', desiredPartnerGenders: null }),
        ]);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(result.totalCandidatesBeforeFilter).toBe(4);
        // Order mirrors findMany order; sort both sides so insertion order doesn't matter.
        expect(result.matches!.map((m) => m.id).sort()).toEqual(['cand_male', 'cand_other'].sort());
      });

      // Req 4a: candidate with gender=null is NOT treated as a match when viewer has an explicit filter.
      // null gender cannot be mapped to any AcceptedPartnerGender → candidateMeetsViewerFilter returns false.
      it('req4a: candidate with null gender is excluded when viewer has an explicit desiredPartnerGenders', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        );
        prisma.userProfile.findMany.mockResolvedValue([
          makeProfileRow({ id: 'cand_null_gender', userId: 'u_ng', gender: null }),
        ]);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(result.totalCandidatesBeforeFilter).toBe(1);
        expect(result.matches).toHaveLength(0);
      });

      // Req 4b: PREFER_NOT_TO_SAY is a valid GenderIdentity but is NOT in AcceptedPartnerGender.
      // toAcceptedPartnerGenderOrNull returns null for it → excluded when viewer has any explicit filter.
      it('req4b: candidate with PREFER_NOT_TO_SAY gender is excluded when viewer has an explicit desiredPartnerGenders', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE', 'OTHER'],
          }),
        );
        prisma.userProfile.findMany.mockResolvedValue([
          makeProfileRow({ id: 'cand_pnts', userId: 'u_pnts', gender: 'PREFER_NOT_TO_SAY' }),
        ]);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(result.totalCandidatesBeforeFilter).toBe(1);
        expect(result.matches).toHaveLength(0);
      });
    });
    // ── end Phase 3 Step 4 ────────────────────────────────────────────────────

    it('reports hasEvaluation=false when candidate has no evaluation rows', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', evaluationCount: 0 }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches![0].hasEvaluation).toBe(false);
    });

    // Phase 2: HG hard-eligibility gate
    it('excludes candidate where wantsChildren=NO conflicts with partnerWantsChildren=MUST_WANT', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            partnerWantsChildren: 'MUST_WANT',
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          wantsChildren: 'NO',
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    it('includes candidate when HG fields are not set (graceful degradation)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          // No HG fields set
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          // No HG fields set
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
    });

    it('enforces HG gate when acceptedPartnerSmoking is array: conflicting smoker is excluded', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            acceptedPartnerSmoking: ['NONE_ONLY'],
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          smokingFrequency: 'REGULAR',
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    it('enforces HG gate when acceptedPartnerAlcohol is array: conflicting alcohol use is excluded', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            acceptedPartnerAlcohol: ['NONE_ONLY'],
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          alcoholUse: 'FREQUENT',
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });
  });

  // ─── list() — matchScore from UserProfileEvaluation ──────────────────────

  it('returns numeric matchScore sourced from UserProfileEvaluation when both profiles have valid signals', async () => {
    const evalWithSignals = {
      profileId: candidateProfileId,
      evaluationJson: {
        self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
        partner: { signals: {} },
        relationship: { signals: {} },
      },
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    };

    prisma.userProfile.findUnique.mockResolvedValue(
      makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
    );
    // Viewer evaluation (via latestEvaluationForProfile → findFirst)
    prisma.userProfileEvaluation.findFirst.mockResolvedValue({
      evaluationJson: evalWithSignals.evaluationJson,
      createdAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    prisma.userProfile.findMany.mockResolvedValue([
      makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
    ]);
    prisma.userProfileEvaluation.findFirst.mockImplementation(() =>
      Promise.resolve({
        evaluationJson: evalWithSignals.evaluationJson,
        createdAt: evalWithSignals.createdAt,
      }),
    );

    const result = await service.list(viewerUserId);

    expect(result.status).toBe('ready');
    expect(result.matches).toHaveLength(1);
    // matchScore must be a finite number — data sourced entirely from UserProfileEvaluation
    expect(typeof result.matches![0].matchScore).toBe('number');
    expect(Number.isFinite(result.matches![0].matchScore)).toBe(true);
    expect(result.matches![0].explainability).not.toBeNull();
  });

  // ─── getById() ────────────────────────────────────────────────────────────

  describe('getById()', () => {
    it('throws NotFoundException when viewer has no UserProfile', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when viewer profile is not ANALYZED', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId, status: S_DRAFT }),
      );

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when candidate profile does not exist', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE' }),
        )
        .mockResolvedValueOnce(null);

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException when candidate fails gender filter (no info leak)', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        )
        .mockResolvedValueOnce(
          // Candidate is MALE — viewer wants FEMALE.
          makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'MALE' }),
        );

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns match detail when candidate is eligible', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        )
        .mockResolvedValueOnce(
          makeProfileRow({
            id: candidateProfileId,
            userId: 'user_cand',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
        );

      const result = await service.getById(viewerUserId, candidateProfileId);

      expect(result.id).toBe(candidateProfileId);
      expect(result.gender).toBe('FEMALE');
      expect(result.hasEvaluation).toBe(true);
    });

    it('includes evaluationSummary from display.summary when evaluation exists', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        )
        .mockResolvedValueOnce(
          makeProfileRow({
            id: candidateProfileId,
            userId: 'user_cand',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
        );
      prisma.userProfileEvaluation.findFirst.mockResolvedValue({
        evaluationJson: { display: { summary: 'Thoughtful and grounded.' } },
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
      });

      const result = await service.getById(viewerUserId, candidateProfileId);

      expect(result.evaluationSummary).toBe('Thoughtful and grounded.');
    });

    it('throws NotFoundException when no UserProfileEvaluation row exists for viewer or candidate', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        )
        .mockResolvedValueOnce(
          makeProfileRow({
            id: candidateProfileId,
            userId: 'user_cand',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
            evaluationCount: 0,
          }),
        );
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(null);

      await expect(service.getById(viewerUserId, candidateProfileId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns numeric matchScore sourced from UserProfileEvaluation when both profiles have valid signals', async () => {
      const evalWithSignals = {
        evaluationJson: {
          self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
          partner: { signals: {} },
          relationship: { signals: {} },
          display: { summary: 'Warm and direct.' },
        },
        createdAt: new Date('2026-04-01T10:00:00.000Z'),
      };

      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
        )
        .mockResolvedValueOnce(
          makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
        );
      // Both viewer and candidate evaluations arrive via findFirst
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(evalWithSignals);

      const result = await service.getById(viewerUserId, candidateProfileId);

      expect(result.id).toBe(candidateProfileId);
      // matchScore must be a finite number — data sourced entirely from UserProfileEvaluation
      expect(typeof result.matchScore).toBe('number');
      expect(Number.isFinite(result.matchScore)).toBe(true);
      expect(result.explainability).not.toBeNull();
      expect(result.evaluationSummary).toBe('Warm and direct.');
    });
  });

  // ─── Phase 4 — consolidated match-ready happy path ──────────────────────
  //
  // Validates all five Phase 4 requirements in one focused describe block:
  //   1. Match-ready viewer gets status=ready from list().
  //   2. The other (candidate) user appears in the returned list.
  //   3. getById() returns valid detail with finite matchScore.
  //   4. not_ready / no_profile path returns correct status (UI guard precondition).
  //   5. not_ready / not_analyzed path returns correct status (UI guard precondition).
  //
  // All reads come from UserProfile + UserProfileEvaluation only — no legacy tables.
  describe('Phase 4 — match-ready validation (new-model path only)', () => {
    const evalPayload = {
      self: {
        signals: {
          emotionalDepth: 6,
          attachmentSecurity: 6,
          socialBattery: 5,
          lifestylePace: 5,
        },
      },
      partner: {
        signals: {
          emotionalDepth: 5,
          lifestylePace: 4,
          socialBattery: 3,
        },
      },
      relationship: {
        signals: {
          emotionalDepth: 6,
          attachmentSecurity: 5,
          relationshipClarity: 7,
          traditionalism: 6,
        },
      },
      display: { summary: 'Warm and values-driven person.' },
    };

    const viewerEvalRow = {
      profileId: viewerProfileId,
      evaluationJson: evalPayload,
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
    };
    const candidateEvalRow = {
      profileId: candidateProfileId,
      evaluationJson: evalPayload,
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
    };

    // ── Requirement 1 + 2: list() returns ready, candidate appears ──────────
    it('req 1+2: list() returns status=ready and candidate appears with finite matchScore', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(viewerEvalRow);
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
        }),
      ]);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(viewerEvalRow);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.viewerProfileId).toBe(viewerProfileId);
      expect(result.matches).toHaveLength(1);

      const match = result.matches![0];
      expect(match.id).toBe(candidateProfileId);
      expect(match.hasEvaluation).toBe(true);
      expect(typeof match.matchScore).toBe('number');
      expect(Number.isFinite(match.matchScore)).toBe(true);
      expect(match.explainability).not.toBeNull();
      expect(Array.isArray(match.explainability?.positiveChips)).toBe(true);
      expect(typeof match.explainability?.reasonShort).toBe('string');
      expect(match.recommendation).not.toBeNull();
      expect(typeof match.recommendation?.primaryTakeaway).toBe('string');
    });

    // ── Requirement 3: getById() returns full detail ─────────────────────────
    it('req 3: getById() returns detail with finite matchScore, explainability, evaluationSummary', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        )
        .mockResolvedValueOnce(
          makeProfileRow({
            id: candidateProfileId,
            userId: 'user_cand',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
        );
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(viewerEvalRow);

      const detail = await service.getById(viewerUserId, candidateProfileId);

      expect(detail.id).toBe(candidateProfileId);
      expect(detail.gender).toBe('FEMALE');
      expect(detail.hasEvaluation).toBe(true);
      expect(typeof detail.matchScore).toBe('number');
      expect(Number.isFinite(detail.matchScore)).toBe(true);
      expect(detail.explainability).not.toBeNull();
      expect(detail.recommendation).not.toBeNull();
      expect(detail.evaluationSummary).toBe('Warm and values-driven person.');
    });

    // ── Requirement 4: no_profile path (UI guard: redirect to /onboarding) ──
    it('req 4: list() returns not_ready/no_profile when viewer has no UserProfile', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('no_profile');
      // Matches absent — UI guard should redirect before rendering match list.
      expect(result.matches).toBeUndefined();
    });

    // ── Requirement 5: not_analyzed path (UI guard: redirect to /dating/analysis)
    it('req 5: list() returns not_ready/not_analyzed when viewer profile exists but is DRAFT', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId, status: S_DRAFT }),
      );

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('not_analyzed');
      expect(result.matches).toBeUndefined();
    });
  });

  // ─── Static isolation contract — no legacy delegates in Prisma mock ───────────
  //
  // Constructs a Prisma mock that contains ONLY userProfile and
  // userProfileEvaluation. Legacy table properties are entirely absent (not even
  // null). Any runtime access to a legacy delegate would throw a TypeError.
  //
  // Proven by: static structure — the service must succeed even when the Prisma
  // client has no knowledge of matchmakingProfile / profileExtractionV2 etc.
  // This is the "empty DB" proof required by the detachment contract:
  //   - legacy tables do not need to exist or be populated for the active path.
  describe('static isolation contract — Prisma mock contains only new-model delegates', () => {
    const evalPayload = {
      self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
      partner: { signals: {} },
      relationship: { signals: {} },
      display: { summary: 'Focused and kind.' },
    };

    it('list() returns status=ready with matches when Prisma mock has no legacy table delegates', async () => {
      const newModelOnlyPrisma = {
        // Intentionally no matchmakingProfile, profileExtractionV2, etc.
        userProfile: {
          findUnique: jest.fn().mockResolvedValue(
            makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
          ),
          findMany: jest.fn().mockResolvedValue([
            makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
          ]),
        },
        userProfileEvaluation: {
          findFirst: jest.fn().mockResolvedValue({
            evaluationJson: evalPayload,
            createdAt: new Date(),
          }),
        },
      };

      const isolatedSvc = new MeMatchesService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
      );

      const result = await isolatedSvc.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(typeof result.matches![0].matchScore).toBe('number');
      expect(Number.isFinite(result.matches![0].matchScore)).toBe(true);
      // If legacy tables were accessed, JavaScript would throw:
      //   TypeError: Cannot read properties of undefined (reading 'findMany')
      // The test passing proves the active list() path touches only new-model tables.
    });

    it('list() returns not_ready when Prisma mock has no legacy table delegates and viewer has no profile', async () => {
      const newModelOnlyPrisma = {
        userProfile: {
          findUnique: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
        },
        userProfileEvaluation: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      const isolatedSvc = new MeMatchesService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
      );

      const result = await isolatedSvc.list(viewerUserId);
      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('no_profile');
    });

    it('getById() returns match detail when Prisma mock has no legacy table delegates', async () => {
      const newModelOnlyPrisma = {
        userProfile: {
          findUnique: jest.fn()
            .mockResolvedValueOnce(
              makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
            )
            .mockResolvedValueOnce(
              makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
            ),
          findMany: jest.fn().mockResolvedValue([]),
        },
        userProfileEvaluation: {
          findFirst: jest.fn().mockResolvedValue({
            evaluationJson: evalPayload,
            createdAt: new Date(),
          }),
        },
      };

      const isolatedSvc = new MeMatchesService(
        newModelOnlyPrisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
      );

      const detail = await isolatedSvc.getById(viewerUserId, candidateProfileId);

      expect(detail.id).toBe(candidateProfileId);
      expect(Number.isFinite(detail.matchScore)).toBe(true);
      expect(detail.evaluationSummary).toBe('Focused and kind.');
    });
  });

  // ─── No-legacy-table contract (Proxy traps) ───────────────────────────────
  //
  // Mounts a Proxy on every legacy Prisma table so that any property access
  // throws LEGACY_TABLE_ACCESSED. Both list() and getById() must complete
  // without touching any legacy table.
  //
  // This test will break immediately if a future change injects a legacy
  // persistence service into MeMatchesService.
  describe('no legacy table reads (contract enforcement)', () => {
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
                `LEGACY_TABLE_ACCESSED: ${table}.${String(prop)} must never be read from the new product matches path`,
              );
            },
          },
        );
      }
    }

    it('list() completes the full happy-path without accessing any legacy table', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
      ]);

      await expect(service.list(viewerUserId)).resolves.toBeDefined();
    });

    it('list() returns not_ready without accessing any legacy table when viewer has no profile', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(service.list(viewerUserId)).resolves.toMatchObject({ status: 'not_ready' });
    });

    it('getById() resolves match detail without accessing any legacy table', async () => {
      mountLegacyTraps();
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE', desiredPartnerGenders: ['FEMALE'] }),
        )
        .mockResolvedValueOnce(
          makeProfileRow({ id: candidateProfileId, userId: 'user_cand', gender: 'FEMALE', desiredPartnerGenders: ['MALE'] }),
        );

      await expect(service.getById(viewerUserId, candidateProfileId)).resolves.toBeDefined();
    });
  });

  // ─── Phase E: read from UserProfilePreference with fallback ───────────────

  describe('Phase F: HG preferences from UserProfilePreference only', () => {
    it('uses UserProfilePreference smoking preference when preference row is present', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            acceptedPartnerSmoking: ['NONE_ONLY'],
          }),
        }),
      );
      // Candidate smokes regularly → HG FAIL from preference row data
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          smokingFrequency: 'REGULAR',
          preference: null, // no preference row for candidate
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      // Candidate must be excluded because the preference row supplied acceptedPartnerSmoking
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    it('when preference row is absent, HG smoking preference is omitted (smoking gate SKIPPED)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: null,
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          smokingFrequency: 'REGULAR',
          preference: null,
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    it('emits hg_preference_fallback_used trace when viewer preference row is null', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: null, // triggers missing_row fallback
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      await service.list(viewerUserId);

      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('hg_preference_fallback_used'),
        'ME_MATCHES_HG_PREF_FALLBACK',
      );
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('missing_row'),
        'ME_MATCHES_HG_PREF_FALLBACK',
      );
    });

    it('does NOT emit hg_preference_fallback_used when viewer preference row is present and non-empty', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            acceptedPartnerSmoking: ['NONE_ONLY'],
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      await service.list(viewerUserId);

      const fallbackCalls = (obs.trace as jest.Mock).mock.calls.filter(
        ([, code]) => code === 'ME_MATCHES_HG_PREF_FALLBACK',
      );
      expect(fallbackCalls).toHaveLength(0);
    });

    it('/me/matches includes compatible candidate when preference row carries smoking prefs', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            acceptedPartnerSmoking: ['NONE_ONLY'],
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: candidateProfileId,
          userId: 'user_cand',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          smokingFrequency: 'NONE', // within accepted set → PASS
          preference: null,
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      // Compatible candidate must be included regardless of source
      expect(result.matches).toHaveLength(1);
      expect(result.matches[0].id).toBe(candidateProfileId);
    });
  });

  describe('read-model → match engine + HG wiring', () => {
    it('calls compareWithStatus and evaluateHolyGrailPairDirections only with readModel slices', async () => {
      const viewerFixture = makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      });
      const candFixture = makeProfileRow({
        id: candidateProfileId,
        userId: 'user_cand',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      });
      const vEval = defaultLatestEval(viewerProfileId);
      const cEval = defaultLatestEval(candidateProfileId);

      prisma.userProfile.findUnique.mockResolvedValue(viewerFixture);
      prisma.userProfile.findMany.mockResolvedValue([candFixture]);

      const { preference: vp, ...vCore } = viewerFixture;
      const { preference: cp, ...cCore } = candFixture;
      const expectedViewer = buildMeMatchesParticipantReadModel(vCore, vp ?? null, vEval);
      const expectedCandidate = buildMeMatchesParticipantReadModel(cCore, cp ?? null, cEval);

      const cmp = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 55,
        explainability: {} as never,
        recommendation: {} as never,
      } as never);
      const hgSpy = jest
        .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
        .mockReturnValue(null);

      await service.list(viewerUserId);

      expect(hgSpy).toHaveBeenCalledWith(expectedViewer.hg.row, expectedCandidate.hg.row);
      expect(cmp).toHaveBeenCalledWith(
        expectedViewer.enginePayload,
        expectedCandidate.enginePayload,
      );
      cmp.mockRestore();
      hgSpy.mockRestore();
    });
  });
});
