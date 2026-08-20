/**
 * Ownership: MatchRankingService — characterization via MeMatchesService façade
 * (Sprint 50 Story 1). Do not rewire to call collaborators directly.
 */
import {
  MatchCandidateNotFoundError,
  MatchDetailEvaluationNotFoundError,
  MatchListCandidateEvaluationMissingError,
  MatchListInvalidCursorError,
  MatchListViewerEvaluationMissingError,
  MatchViewerNotReadyError,
} from '../me-matches.errors';
import { MATCH_LIST_CACHE_VERSION } from '../../cache/match-list-cache';
import { ErrorCodes } from '../../logging/error-codes';
import * as holyGrailPair from '../../matches/holy-grail-pair-directions';
import * as matchEngine from '../../matches/match-engine';
import * as customMetrics from '../../observability/custom-metrics';
import { buildMeMatchesParticipantReadModel } from '../me-profile-engine.mapper';
import * as MeProfileEngineMapper from '../me-profile-engine.mapper';
import { resolveMatchNarrative } from './match-detail-narrative';
import { ProductAnalyticsEvents } from '../../analytics/product-analytics.events';
import {
  makePrefRow,
  makeProfileRow,
  S_ANALYZED,
  S_DRAFT,
  defaultLatestEval,
  setupMeMatchesUnitContext,
} from '../me-matches.spec-support';

describe('MeMatchesService — ranking characterization', () => {
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

    describe('existing hard-block visibility (Sprint 18)', () => {
      const smokingViewer = () =>
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          aboutPartner: "I don't want smokers",
        });
      /** List slim select omits about*; structured smoking + batch about* drive hard-block. */
      const smokingCandidate = (id: string, userId: string) =>
        makeProfileRow({
          id,
          userId,
          gender: 'FEMALE',
          desiredPartnerGenders: ['MALE'],
          smokingFrequency: 'REGULAR',
          aboutMe: null,
        });

      function mockListThenAboutBatch(
        candidates: ReturnType<typeof makeProfileRow>[],
        aboutMe = 'I smoke',
      ) {
        prisma.userProfile.findMany.mockImplementation(
          async (args: {
            select?: { aboutMe?: boolean };
            where?: { id?: { in?: string[] } };
          }) => {
            if (args.select?.aboutMe === true) {
              const ids = args.where?.id?.in ?? [];
              return ids.map((id) => ({
                id,
                aboutMe,
                aboutPartner: null,
                aboutRelationship: null,
              }));
            }
            return candidates;
          },
        );
      }

      it('omits new hard-FAIL candidate (no LIKE / mutual)', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(smokingViewer());
        mockListThenAboutBatch([
          smokingCandidate(candidateProfileId, 'user_cand'),
        ]);
        prisma.matchAction.findMany.mockResolvedValue([]);
        prisma.mutualMatch.findMany.mockResolvedValue([]);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(result.matches).toHaveLength(0);
      });

      it('omits PASS-only hard-FAIL candidate', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(smokingViewer());
        mockListThenAboutBatch([
          smokingCandidate(candidateProfileId, 'user_cand'),
        ]);
        prisma.matchAction.findMany.mockResolvedValue([
          { targetUserId: 'user_cand', action: 'PASS' },
        ]);

        const result = await service.list(viewerUserId);

        expect(result.matches).toHaveLength(0);
      });

      it('keeps Liked hard-FAIL candidate with hardBlocked + smoking reasons', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(smokingViewer());
        mockListThenAboutBatch([
          smokingCandidate(candidateProfileId, 'user_cand'),
        ]);
        prisma.matchAction.findMany.mockResolvedValue([
          { targetUserId: 'user_cand', action: 'LIKE' },
        ]);

        const result = await service.list(viewerUserId);

        expect(result.status).toBe('ready');
        expect(result.matches).toHaveLength(1);
        const item = result.matches![0]!;
        expect(item.id).toBe(candidateProfileId);
        expect(item.yourAction).toBe('LIKE');
        expect(item.hardBlocked?.disabled).toBe(true);
        expect(item.hardBlocked!.reasons.length).toBeGreaterThanOrEqual(1);
        expect(
          item.hardBlocked!.reasons.some(
            (r) =>
              r.dimension === 'smoking' &&
              r.direction === 'viewer_to_them' &&
              r.evidence?.viewerQuote != null &&
              r.evidence?.counterpartyQuote != null,
          ),
        ).toBe(true);
        // About* batch fetch for hard-block evidence (not full-pool hydrate)
        expect(prisma.userProfile.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: { in: [candidateProfileId] } },
            select: {
              id: true,
              aboutMe: true,
              aboutPartner: true,
              aboutRelationship: true,
            },
          }),
        );
      });

      it('keeps hard-FAIL candidate with ACTIVE mutual and no LIKE', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(smokingViewer());
        mockListThenAboutBatch([
          smokingCandidate(candidateProfileId, 'user_cand'),
        ]);
        prisma.matchAction.findMany.mockResolvedValue([]);
        prisma.mutualMatch.findMany.mockResolvedValue([
          { userId1: viewerUserId, userId2: 'user_cand' },
        ]);

        const result = await service.list(viewerUserId);

        expect(result.matches).toHaveLength(1);
        expect(result.matches![0]!.hardBlocked?.disabled).toBe(true);
      });

      it('sorts hard-blocked existing after eligible matches', async () => {
        prisma.userProfile.findUnique.mockResolvedValue(smokingViewer());
        mockListThenAboutBatch([
          smokingCandidate('prof_blocked', 'user_blocked'),
          makeProfileRow({
            id: 'prof_ok',
            userId: 'user_ok',
            gender: 'FEMALE',
            desiredPartnerGenders: ['MALE'],
            aboutMe: null,
          }),
        ]);
        prisma.matchAction.findMany.mockResolvedValue([
          { targetUserId: 'user_blocked', action: 'LIKE' },
        ]);

        const result = await service.list(viewerUserId);

        expect(result.matches?.map((m) => m.id)).toEqual([
          'prof_ok',
          'prof_blocked',
        ]);
        expect(result.matches![0]!.hardBlocked).toBeUndefined();
        expect(result.matches![1]!.hardBlocked?.disabled).toBe(true);
      });
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
      // List path forces empty about* into the read model (slim select).
      const expectedViewer = buildMeMatchesParticipantReadModel(vCore, vp ?? null, vEval);
      const expectedCandidate = buildMeMatchesParticipantReadModel(
        {
          ...cCore,
          aboutMe: null,
          aboutPartner: null,
          aboutRelationship: null,
        },
        cp ?? null,
        cEval,
      );

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
