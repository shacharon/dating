/**
 * Ownership: MatchListCacheService — characterization via MeMatchesService façade
 * (Sprint 50 Story 1). Do not rewire to call collaborators directly.
 */
import {
  MatchCandidateNotFoundError,
  MatchDetailEvaluationNotFoundError,
  MatchListCandidateEvaluationMissingError,
  MatchListInvalidCursorError,
  MatchListViewerEvaluationMissingError,
  MatchViewerNotReadyError,
} from '../support/me-matches.errors';
import { MATCH_LIST_CACHE_VERSION } from '../../../cache/match-list-cache';
import { ErrorCodes } from '../../../logging/error-codes';
import * as holyGrailPair from '../../../matches/holy-grail/holy-grail-pair-directions';
import * as matchEngine from '../../../matches/engine/match-engine';
import * as customMetrics from '../../../observability/custom-metrics';
import { buildMeMatchesParticipantReadModel } from '../../profile/me-profile-engine.mapper';
import * as MeProfileEngineMapper from '../../profile/me-profile-engine.mapper';
import { resolveMatchNarrative } from '../detail/match-detail-narrative';
import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import {
  makePrefRow,
  makeProfileRow,
  S_ANALYZED,
  S_DRAFT,
  defaultLatestEval,
  setupMeMatchesUnitContext,
} from '../support/me-matches.spec-support';

describe('MeMatchesService — list/cache characterization', () => {
  const ctx = setupMeMatchesUnitContext();
  const viewerUserId = ctx.viewerUserId;
  const viewerProfileId = ctx.viewerProfileId;
  const candidateProfileId = ctx.candidateProfileId;
  let prisma: typeof ctx.prisma;
  let obs: typeof ctx.obs;
  let service: typeof ctx.service;
  let photoStorage: typeof ctx.photoStorage;
  let mutualMatches: typeof ctx.mutualMatches;
  let cache: typeof ctx.cache;
  let analytics: typeof ctx.analytics;
  let narrativeGenerate: typeof ctx.narrativeGenerate;
  let narrativeCacheFind: typeof ctx.narrativeCacheFind;
  let narrativeCacheUpsert: typeof ctx.narrativeCacheUpsert;
  let matchListRankQueue: typeof ctx.matchListRankQueue;

  beforeEach(() => {
    prisma = ctx.prisma;
    obs = ctx.obs;
    service = ctx.service;
    photoStorage = ctx.photoStorage;
    mutualMatches = ctx.mutualMatches;
    cache = ctx.cache;
    analytics = ctx.analytics;
    narrativeGenerate = ctx.narrativeGenerate;
    narrativeCacheFind = ctx.narrativeCacheFind;
    narrativeCacheUpsert = ctx.narrativeCacheUpsert;
    matchListRankQueue = ctx.matchListRankQueue;
  });

  describe('list()', () => {
    it('returns not_ready(no_profile) when viewer has no UserProfile', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('no_profile');
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
      expect(narrativeGenerate).not.toHaveBeenCalled();
    });

    it('returns not_ready(not_analyzed) when viewer profile is DRAFT', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId, status: S_DRAFT }),
      );

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('not_analyzed');
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
    });

    it('returns not_ready(no_photo) when viewer is ANALYZED but has no approved photos', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfilePhoto.count.mockResolvedValue(0);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('not_ready');
      expect(result.reason).toBe('no_photo');
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
      expect(analytics.track).toHaveBeenCalledWith(
        viewerUserId,
        ProductAnalyticsEvents.PROFILE_PHOTO_GATE_BLOCKED,
        { surface: 'match_list' },
      );
      expect(analytics.track).not.toHaveBeenCalledWith(
        viewerUserId,
        ProductAnalyticsEvents.MATCH_LIST_VIEWED,
        expect.anything(),
      );
      expect(prisma.userProfileEvaluation.findFirst).not.toHaveBeenCalled();
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
      expect(result.nextCursor).toBeNull();
      expect(result.hasMore).toBe(false);
      expect(result.totalCandidatesBeforeFilter).toBe(0);
    });

    describe('Story 5 — miss-path observability', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('emits rebuild phase metrics on cache miss → ready', async () => {
        const loaded = jest.spyOn(customMetrics, 'recordMatchListCandidatesLoaded');
        const eligible = jest.spyOn(
          customMetrics,
          'recordMatchListCandidatesEligible',
        );
        const loadMs = jest.spyOn(customMetrics, 'recordMatchListCandidateLoadMs');
        const evalMs = jest.spyOn(customMetrics, 'recordMatchListEvalQueryMs');
        const scoreMs = jest.spyOn(customMetrics, 'recordMatchListScoreCpuMs');
        const cacheSetMs = jest.spyOn(customMetrics, 'recordMatchListCacheSetMs');
        const miss = jest.spyOn(customMetrics, 'recordCacheMiss');
        const hit = jest.spyOn(customMetrics, 'recordCacheHit');

        prisma.userProfile.findUnique.mockResolvedValue(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        );
        prisma.userProfile.count
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(1);
        prisma.userProfile.findMany.mockResolvedValue([]);
        cache.get.mockResolvedValue(null);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(miss).toHaveBeenCalled();
        expect(hit).not.toHaveBeenCalled();
        expect(loaded).toHaveBeenCalledWith(0);
        expect(eligible).toHaveBeenCalledWith(1);
        expect(loadMs).toHaveBeenCalledWith(expect.any(Number));
        expect(evalMs).toHaveBeenCalledWith(expect.any(Number));
        expect(scoreMs).toHaveBeenCalledWith(expect.any(Number));
        expect(cacheSetMs).toHaveBeenCalledWith(expect.any(Number));
        expect(cache.set).toHaveBeenCalled();
        expect(obs.trace).toHaveBeenCalledWith(
          expect.stringMatching(
            /candidateLoadMs=\d+ evalQueryMs=\d+ scoreCpuMs=\d+/,
          ),
          ErrorCodes.ME_MATCHES_LIST_OK,
        );
      });

      it('does not emit rebuild phase metrics on cache hit', async () => {
        const loaded = jest.spyOn(customMetrics, 'recordMatchListCandidatesLoaded');
        const eligible = jest.spyOn(
          customMetrics,
          'recordMatchListCandidatesEligible',
        );
        const loadMs = jest.spyOn(customMetrics, 'recordMatchListCandidateLoadMs');
        const evalMs = jest.spyOn(customMetrics, 'recordMatchListEvalQueryMs');
        const scoreMs = jest.spyOn(customMetrics, 'recordMatchListScoreCpuMs');
        const cacheSetMs = jest.spyOn(customMetrics, 'recordMatchListCacheSetMs');
        const hit = jest.spyOn(customMetrics, 'recordCacheHit');
        const miss = jest.spyOn(customMetrics, 'recordCacheMiss');

        cache.get.mockResolvedValue({
          version: MATCH_LIST_CACHE_VERSION,
          builtAt: new Date().toISOString(),
          statusMeta: {
            status: 'ready',
            viewerProfileId,
            viewerGender: 'MALE',
            viewerAcceptedPartnerGenders: ['FEMALE'],
            viewerProfileAnalysisStale: false,
            totalCandidatesBeforeFilter: 0,
            filteredNoPhotoCandidates: 0,
          },
          matches: [],
        });

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(hit).toHaveBeenCalled();
        expect(miss).not.toHaveBeenCalled();
        expect(loaded).not.toHaveBeenCalled();
        expect(eligible).not.toHaveBeenCalled();
        expect(loadMs).not.toHaveBeenCalled();
        expect(evalMs).not.toHaveBeenCalled();
        expect(scoreMs).not.toHaveBeenCalled();
        expect(cacheSetMs).not.toHaveBeenCalled();
        expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
      });

      it('does not emit rebuild phase metrics on cache miss → not_ready', async () => {
        const loaded = jest.spyOn(customMetrics, 'recordMatchListCandidatesLoaded');
        const evalMs = jest.spyOn(customMetrics, 'recordMatchListEvalQueryMs');
        const scoreMs = jest.spyOn(customMetrics, 'recordMatchListScoreCpuMs');
        const cacheSetMs = jest.spyOn(customMetrics, 'recordMatchListCacheSetMs');

        prisma.userProfile.findUnique.mockResolvedValue(null);
        cache.get.mockResolvedValue(null);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('not_ready');
        expect(loaded).not.toHaveBeenCalled();
        expect(evalMs).not.toHaveBeenCalled();
        expect(scoreMs).not.toHaveBeenCalled();
        expect(cacheSetMs).not.toHaveBeenCalled();
        expect(cache.set).not.toHaveBeenCalled();
      });
    });

    it('list() throws MatchListViewerEvaluationMissingError when viewer has no UserProfileEvaluation row', async () => {
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
        MatchListViewerEvaluationMissingError,
      );
    });

    it('list() throws MatchListCandidateEvaluationMissingError when a candidate has no UserProfileEvaluation row', async () => {
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
            version: 'v1',
          });
        }
        return Promise.resolve(null);
      });

      await expect(service.list(viewerUserId)).rejects.toBeInstanceOf(
        MatchListCandidateEvaluationMissingError,
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

    it('returns trimmed nickname when set', async () => {
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
          nickname: 'Alex',
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.matches?.[0]?.nickname).toBe('Alex');
    });

    it('excludes candidate when viewer has BLOCK action toward them', async () => {
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
      prisma.matchAction.findMany.mockResolvedValue([
        { targetUserId: 'user_cand', action: 'BLOCK' },
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(0);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    it('includes candidate when viewer has LIKE action toward them', async () => {
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
      prisma.matchAction.findMany.mockResolvedValue([
        { targetUserId: 'user_cand', action: 'LIKE' },
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.matches![0].yourAction).toBe('LIKE');
    });

    it('paginates ranked list with nextCursor and hasMore', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.count.mockResolvedValue(3);
      prisma.userProfile.findMany.mockResolvedValue([
        makeProfileRow({
          id: 'cand_a',
          userId: 'user_a',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
        }),
        makeProfileRow({
          id: 'cand_b',
          userId: 'user_b',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
        }),
        makeProfileRow({
          id: 'cand_c',
          userId: 'user_c',
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
        }),
      ]);

      const page1 = await service.list(viewerUserId, { limit: 2 });
      expect(page1.status).toBe('ready');
      expect(page1.matches).toHaveLength(2);
      expect(page1.hasMore).toBe(true);
      expect(page1.nextCursor).toBeTruthy();

      const page2 = await service.list(viewerUserId, {
        limit: 2,
        cursor: page1.nextCursor!,
      });
      expect(page2.status).toBe('ready');
      expect(page2.matches!.length).toBeGreaterThanOrEqual(1);
      const ids = [
        ...(page1.matches ?? []).map((m) => m.id),
        ...(page2.matches ?? []).map((m) => m.id),
      ];
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('includes approved primary photo URL and approved photo count', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([
        {
          ...makeProfileRow({
            id: candidateProfileId,
            userId: 'user_cand',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
          photos: [
            { id: 'photo_primary', isPrimary: true },
            { id: 'photo_other', isPrimary: false },
          ],
        },
      ]);

      const result = await service.list(viewerUserId);

      expect(result.matches).toHaveLength(1);
      expect(result.matches?.[0].primaryPhotoUrl).toBe(
        `/api/v1/me/matches/${candidateProfileId}/photos/photo_primary/file`,
      );
      expect(result.matches?.[0].approvedPhotoCount).toBe(2);
    });

    it('returns null primaryPhotoUrl when no approved primary photo exists', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.count.mockResolvedValue(1);
      prisma.userProfile.findMany.mockResolvedValue([
        {
          ...makeProfileRow({
            id: candidateProfileId,
            userId: 'user_cand',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
          photos: [{ id: 'photo_other', isPrimary: false }],
        },
      ]);

      const result = await service.list(viewerUserId);

      expect(result.matches).toHaveLength(1);
      expect(result.matches?.[0].primaryPhotoUrl).toBeNull();
      expect(result.matches?.[0].approvedPhotoCount).toBe(1);
      expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            photos: { some: { status: 'APPROVED' } },
          }),
          select: expect.objectContaining({
            photos: expect.objectContaining({
              where: { status: 'APPROVED' },
            }),
            locationLabel: true,
            signals: expect.any(Object),
            interests: expect.any(Object),
          }),
        }),
      );
      const listSelect = prisma.userProfile.findMany.mock.calls[0][0]
        .select as Record<string, unknown>;
      expect(listSelect.aboutMe).toBeUndefined();
      expect(listSelect.aboutPartner).toBeUndefined();
      expect(listSelect.aboutRelationship).toBeUndefined();
      expect(listSelect.city).toBeUndefined();
      expect(listSelect.country).toBeUndefined();
      expect(listSelect.status).toBeUndefined();
      expect(listSelect.user).toBeUndefined();
    });

    it('excludes candidates with zero approved photos from list', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.count
        .mockResolvedValueOnce(2) // base ANALYZED pool
        .mockResolvedValueOnce(1); // photo+prefilter eligible (uncapped)
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
      expect(result.totalCandidatesBeforeFilter).toBe(1);
      expect(result.filteredNoPhotoCandidates).toBe(1);
      expect(result.matches!.every((m) => m.approvedPhotoCount >= 1)).toBe(true);
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

    it('list() findMany where includes gender in-clause when viewer has partner gender prefs', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      await service.list(viewerUserId);

      expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gender: { in: ['FEMALE'] },
          }),
        }),
      );
      expect(prisma.userProfile.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: { not: viewerUserId },
            status: 'ANALYZED',
            user: { deletedAt: null },
          },
        }),
      );
    });

    it('list() findMany where omits gender when viewer partner genders are open', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'FEMALE',
          desiredPartnerGenders: null,
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      await service.list(viewerUserId);

      const findManyWhere = prisma.userProfile.findMany.mock.calls[0][0]
        .where as Record<string, unknown>;
      expect(findManyWhere.gender).toBeUndefined();
    });

    it('list() hydrates at most MATCH_LIST_CANDIDATE_CAP with analyzedAt order', async () => {
      const prev = process.env['MATCH_LIST_CANDIDATE_CAP'];
      process.env['MATCH_LIST_CANDIDATE_CAP'] = '2';
      try {
        prisma.userProfile.findUnique.mockResolvedValue(
          makeProfileRow({
            id: viewerProfileId,
            userId: viewerUserId,
            gender: 'MALE',
            desiredPartnerGenders: ['FEMALE'],
          }),
        );
        prisma.userProfile.count
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(5);
        prisma.userProfile.findMany.mockResolvedValue([
          makeProfileRow({
            id: 'cand_a',
            userId: 'user_a',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
          makeProfileRow({
            id: 'cand_b',
            userId: 'user_b',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
          }),
        ]);

        const result = await service.list(viewerUserId);

        expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 2,
            orderBy: [
              { analyzedAt: { sort: 'desc', nulls: 'last' } },
              { id: 'asc' },
            ],
          }),
        );
        expect(result.totalCandidatesBeforeFilter).toBe(2);
        // Cap must not inflate filteredNoPhoto: base(10) - eligible(5) = 5
        expect(result.filteredNoPhotoCandidates).toBe(5);
        expect(result.matches?.length).toBeLessThanOrEqual(2);
      } finally {
        if (prev === undefined) delete process.env['MATCH_LIST_CANDIDATE_CAP'];
        else process.env['MATCH_LIST_CANDIDATE_CAP'] = prev;
      }
    });

    it('list() findMany where includes birthDate bounds when viewer has age prefs', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          preference: makePrefRow({
            profileId: viewerProfileId,
            acceptedPartnerGenders: ['FEMALE'],
            partnerAgeMin: 25,
            partnerAgeMax: 40,
          }),
        }),
      );
      prisma.userProfile.findMany.mockResolvedValue([]);

      await service.list(viewerUserId);

      expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gender: { in: ['FEMALE'] },
            birthDate: expect.objectContaining({
              not: null,
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
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

    // Sprint 18 Story 1 — existing vs new hard-block visibility


  });
});
