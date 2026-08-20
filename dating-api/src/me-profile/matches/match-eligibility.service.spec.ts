/**
 * Ownership: MatchEligibilityService — characterization via MeMatchesService façade
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

describe('MeMatchesService — eligibility characterization', () => {
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

  describe('assertMatchCandidateVisible()', () => {
    it('throws MatchViewerNotReadyError when viewer has no approved photo', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
        }),
      );
      prisma.userProfilePhoto.count.mockResolvedValue(0);

      await expect(
        service.assertMatchCandidateVisible(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchViewerNotReadyError);
    });

    it('throws MatchCandidateNotFoundError when viewer blocked the candidate', async () => {
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
      prisma.matchAction.findUnique.mockResolvedValue({ action: 'BLOCK' });

      await expect(
        service.assertMatchCandidateVisible(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
    });

    it('throws MatchCandidateNotFoundError when candidate has no approved photos', async () => {
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
            photos: [],
          }),
        );

      await expect(
        service.assertMatchCandidateVisible(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
    });
  });

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
      version: 'v1',
    };
    const candidateEvalRow = {
      profileId: candidateProfileId,
      evaluationJson: evalPayload,
      createdAt: new Date('2026-04-18T00:00:00.000Z'),
      version: 'v1',
    };

    // ── Requirement 1 + 2: list() returns ready, candidate appears ──────────
    it('req 1+2: list() returns status=ready and candidate appears with finite matchScore', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
          datingChapter: 'first_chapter',
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
      expect(match.teaser).toEqual(
        expect.objectContaining({
          mode: 'first_chapter',
          showScore: true,
        }),
      );
      expect(match.teaser.lines.length).toBeGreaterThan(0);
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

  describe('Phase F: HG preferences from UserProfilePreference only', () => {
    it('uses UserProfilePreference genders when preference row is present', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({
          id: viewerProfileId,
          userId: viewerUserId,
          gender: 'MALE',
          desiredPartnerGenders: ['FEMALE'],
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
          preference: null,
        }),
      ]);

      const result = await service.list(viewerUserId);

      expect(result.status).toBe('ready');
      expect(result.matches).toHaveLength(1);
      expect(result.totalCandidatesBeforeFilter).toBe(1);
    });

    it('when preference row is absent, legacy desiredPartnerGenders still allow matches', async () => {
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
  });
});
