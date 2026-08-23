/**
 * Ownership: MatchDetailService — characterization via MeMatchesService façade
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
import { resolveMatchNarrative } from './match-detail-narrative';
import { ProductAnalyticsEvents } from '../../../analytics/product-analytics.events';
import {
  makePrefRow,
  makeProfileRow,
  S_ANALYZED,
  S_DRAFT,
  defaultLatestEval,
  setupMeMatchesUnitContext,
} from '../support/me-matches.spec-support';

describe('MeMatchesService — detail characterization', () => {
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

  describe('getById() — existing hard-block visibility (Sprint 18)', () => {
    const smokingViewer = () =>
      makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        aboutPartner: "I don't want smokers",
      });
    const smokingCandidate = () =>
      makeProfileRow({
        id: candidateProfileId,
        userId: 'user_cand',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
        aboutMe: 'I smoke',
      });

    it('404s hard-FAIL when candidate is not existing', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(smokingViewer())
        .mockResolvedValueOnce(smokingCandidate());
      prisma.matchAction.findUnique.mockResolvedValue(null);
      mutualMatches.findActiveByUserPair.mockResolvedValue(null);

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
    });

    it('returns 200 + hardBlocked when Liked hard-FAIL', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(smokingViewer())
        .mockResolvedValueOnce(smokingCandidate());
      // assertViewerHasNotBlockedTarget
      prisma.matchAction.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ action: 'LIKE' });
      mutualMatches.findActiveByUserPair.mockResolvedValue(null);

      const detail = await service.getById(viewerUserId, candidateProfileId);

      expect(detail.id).toBe(candidateProfileId);
      expect(detail.hardBlocked?.disabled).toBe(true);
      expect(detail.hardBlocked!.reasons.some((r) => r.dimension === 'smoking')).toBe(
        true,
      );
    });
  });

  describe('getById()', () => {
    it('throws MatchViewerNotReadyError when viewer has no UserProfile', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchViewerNotReadyError);
    });

    it('throws MatchViewerNotReadyError when viewer profile is not ANALYZED', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(
        makeProfileRow({ id: viewerProfileId, userId: viewerUserId, status: S_DRAFT }),
      );

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchViewerNotReadyError);
    });

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
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchViewerNotReadyError);
    });

    it('throws MatchCandidateNotFoundError when candidate profile does not exist', async () => {
      prisma.userProfile.findUnique
        .mockResolvedValueOnce(
          makeProfileRow({ id: viewerProfileId, userId: viewerUserId, gender: 'MALE' }),
        )
        .mockResolvedValueOnce(null);

      await expect(
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
    });

    it('throws MatchCandidateNotFoundError when candidate fails gender filter (no info leak)', async () => {
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
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
    });

    it('throws MatchCandidateNotFoundError when candidate has no approved photos (no info leak)', async () => {
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
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
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

    it('returns trimmed nickname on detail when set', async () => {
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
            nickname: '  River  ',
          }),
        );

      const result = await service.getById(viewerUserId, candidateProfileId);

      expect(result.nickname).toBe('River');
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
        service.getById(viewerUserId, candidateProfileId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);
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

    it('throws MatchDetailEvaluationNotFoundError when no UserProfileEvaluation row exists for viewer or candidate', async () => {
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
        MatchDetailEvaluationNotFoundError,
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
        version: 'v1',
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

    it('getById() includes matchExplanationTraits when positiveChips exist', async () => {
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
      const exp = {
        positiveChips: ['Emotional depth', 'Money mindset'],
        reasonShort: 'Test reason',
      };
      const spy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: exp,
        recommendation: {
          explainability: exp,
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
        },
      } as never);
      try {
        const detail = await service.getById(viewerUserId, candidateProfileId);
        expect(detail.matchExplanationTraits).toBeDefined();
        expect(detail.matchExplanationTraits!.length).toBe(2);
        expect(detail.matchExplanationTraits![0].group).toBe('Emotional connection');
        expect(detail.matchExplanationTraits![0].evidence).toBeTruthy();
        expect(detail.matchExplanationTraits!.every((t) => t.strength === 'strong')).toBe(
          true,
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('getById() leaves matchExplanationTraits undefined when compareWithStatus returns guard', async () => {
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
      const spy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        status: 'INSUFFICIENT_DATA',
        message: 'Profile self signals are empty or non-numeric; cannot score match',
        compatibility: null,
        partnerFit: null,
        relationshipFit: null,
        coverage: null,
        friction: null,
        finalScore: null,
      } as never);
      try {
        const detail = await service.getById(viewerUserId, candidateProfileId);
        expect(detail.matchExplanationTraits).toBeUndefined();
        expect(detail.matchScore).toBeNull();
        expect(detail.matchNarrative).toBeUndefined();
        expect(narrativeGenerate).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('getById() includes matchNarrative on scored detail (cache miss)', async () => {
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
      const exp = {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Test reason',
      };
      const spy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: exp,
        recommendation: {
          explainability: exp,
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
          caution: null,
        },
      } as never);
      try {
        const detail = await service.getById(viewerUserId, candidateProfileId);
        expect(detail.matchNarrative).toBe('Generated narrative prose.');
        expect(narrativeCacheFind).toHaveBeenCalled();
        expect(narrativeGenerate).toHaveBeenCalledTimes(1);
        expect(narrativeCacheUpsert).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('getById() returns cached matchNarrative without calling generator', async () => {
      narrativeCacheFind.mockResolvedValue('Cached narrative from DB.');
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
      const exp = {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Test reason',
      };
      const spy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: exp,
        recommendation: {
          explainability: exp,
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
          caution: null,
        },
      } as never);
      try {
        const detail = await service.getById(viewerUserId, candidateProfileId);
        expect(detail.matchNarrative).toBe('Cached narrative from DB.');
        expect(narrativeGenerate).not.toHaveBeenCalled();
        expect(narrativeCacheUpsert).not.toHaveBeenCalled();
      } finally {
        spy.mockRestore();
      }
    });

    it('getById() caches LLM narrative but not fallback', async () => {
      narrativeGenerate.mockResolvedValue({
        narrative: 'LLM prose about shared depth.',
        source: 'llm',
        promptVersion: 'v1',
      });
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
      const exp = {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Test reason',
      };
      const spy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: exp,
        recommendation: {
          explainability: exp,
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
          caution: null,
        },
      } as never);
      try {
        const detail = await service.getById(viewerUserId, candidateProfileId);
        expect(detail.matchNarrative).toBe('LLM prose about shared depth.');
        expect(narrativeCacheUpsert).toHaveBeenCalledTimes(1);
        expect(narrativeCacheUpsert.mock.calls[0][0]).toMatchObject({
          viewerProfileId,
          candidateProfileId,
          viewerEvaluationId: `eval_${viewerProfileId}`,
          candidateEvaluationId: `eval_${candidateProfileId}`,
          narrative: 'LLM prose about shared depth.',
        });
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe('resolveMatchNarrative()', () => {
    const baseArgs = {
      viewerProfileId,
      candidateProfileId,
      viewerEvaluationId: 'eval_v1',
      candidateEvaluationId: 'eval_c1',
      finalScore: 70,
      explainability: {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Short',
      },
      recommendation: {
        primaryTakeaway: 'Take',
        suggestedNextAction: 'Next',
        caution: null as string | null,
      },
    };

    const runNarrative = (args: typeof baseArgs) =>
      resolveMatchNarrative(
        {
          obs: obs as unknown as StructuredObservabilityService,
          matchNarrativeGenerator: { generate: narrativeGenerate } as never,
          matchNarrativeCache: {
            find: narrativeCacheFind,
            upsert: narrativeCacheUpsert,
          } as never,
        },
        args as never,
      );

    it('cache hit skips generator', async () => {
      narrativeCacheFind.mockResolvedValue('hit text');
      const text = await runNarrative(baseArgs);
      expect(text).toBe('hit text');
      expect(narrativeGenerate).not.toHaveBeenCalled();
    });

    it('evaluation id change uses new cache key (miss → generate)', async () => {
      narrativeCacheFind.mockResolvedValue(null);
      await runNarrative({
        ...baseArgs,
        candidateEvaluationId: 'eval_c2',
      });
      expect(narrativeCacheFind).toHaveBeenCalledWith(
        expect.objectContaining({ candidateEvaluationId: 'eval_c2' }),
      );
      expect(narrativeGenerate).toHaveBeenCalledTimes(1);
    });

    it('cache read throw is treated as miss', async () => {
      narrativeCacheFind.mockRejectedValue(new Error('db down'));
      const text = await runNarrative(baseArgs);
      expect(text).toBe('Generated narrative prose.');
      expect(narrativeGenerate).toHaveBeenCalledTimes(1);
    });

    it('cache upsert throw still returns narrative (store fail)', async () => {
      narrativeGenerate.mockResolvedValue({
        narrative: 'LLM prose survives store fail.',
        source: 'llm',
        promptVersion: 'v1',
      });
      narrativeCacheUpsert.mockRejectedValue(new Error('upsert boom'));
      const text = await runNarrative({
        viewerProfileId,
        candidateProfileId,
        viewerEvaluationId: 'eval_v1',
        candidateEvaluationId: 'eval_c1',
        finalScore: 70,
        explainability: {
          positiveChips: ['Emotional depth'],
          reasonShort: 'Short',
        },
        recommendation: {
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
          caution: null,
        },
      });
      expect(text).toBe('LLM prose survives store fail.');
      expect(obs.trace).toHaveBeenCalledWith(
        expect.stringContaining('cache store fail'),
        ErrorCodes.ME_MATCHES_NARRATIVE_CACHE_STORE_FAIL,
      );
    });

    it('fallback source returns narrative without cache upsert', async () => {
      narrativeGenerate.mockResolvedValue({
        narrative: 'Structured fallback without chip soup.',
        source: 'fallback',
        promptVersion: 'v4',
      });
      narrativeCacheUpsert.mockClear();
      const text = await runNarrative(baseArgs);
      expect(text).toBe('Structured fallback without chip soup.');
      expect(narrativeCacheUpsert).not.toHaveBeenCalled();
    });
  });

  describe('getPrimaryPhotoFileById()', () => {
    const photoId = 'photo_primary';
    const candUserId = 'user_cand';

    function mockBrowsePhotoFileAccess(opts?: {
      viewerPhotoCount?: number;
      candidatePhotoCount?: number;
      mutual?: boolean;
    }) {
      const viewerPhotoCount = opts?.viewerPhotoCount ?? 1;
      const candidatePhotoCount = opts?.candidatePhotoCount ?? 1;
      mutualMatches.findActiveByUserPair.mockResolvedValue(
        opts?.mutual ? { id: 'mutual_1' } : null,
      );
      prisma.userProfile.findUnique.mockImplementation(
        (args: {
          where: { userId?: string; id?: string };
          include?: unknown;
          select?: unknown;
        }) => {
          if (args.where.id === candidateProfileId) {
            return Promise.resolve({
              id: candidateProfileId,
              userId: candUserId,
              status: S_ANALYZED,
              birthDate: new Date('1990-06-15T00:00:00.000Z'),
              gender: 'FEMALE',
              desiredPartnerGenders: ['MALE'],
              city: 'TLV',
              country: 'IL',
              locationLabel: 'Tel Aviv, IL',
              aboutMe: 'About me',
              aboutPartner: 'About partner',
              aboutRelationship: 'About relationship',
              preference: null,
              user: { deletedAt: null },
            });
          }
          if (args.where.userId === viewerUserId) {
            return Promise.resolve(
              makeProfileRow({
                id: viewerProfileId,
                userId: viewerUserId,
                gender: 'MALE',
                desiredPartnerGenders: ['FEMALE'],
              }),
            );
          }
          return Promise.resolve(null);
        },
      );
      prisma.userProfilePhoto.count.mockImplementation(
        ({ where }: { where: { profileId: string } }) => {
          if (where.profileId === viewerProfileId) {
            return Promise.resolve(viewerPhotoCount);
          }
          if (where.profileId === candidateProfileId) {
            return Promise.resolve(candidatePhotoCount);
          }
          return Promise.resolve(0);
        },
      );
    }

    it('throws MatchCandidateNotFoundError when viewer has no approved photo (non-mutual)', async () => {
      mockBrowsePhotoFileAccess({ viewerPhotoCount: 0 });

      await expect(
        service.getPrimaryPhotoFileById(viewerUserId, candidateProfileId, photoId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);

      expect(prisma.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });

    it('throws MatchCandidateNotFoundError when candidate has no approved photo (non-mutual)', async () => {
      mockBrowsePhotoFileAccess({ candidatePhotoCount: 0 });

      await expect(
        service.getPrimaryPhotoFileById(viewerUserId, candidateProfileId, photoId),
      ).rejects.toBeInstanceOf(MatchCandidateNotFoundError);

      expect(prisma.userProfilePhoto.findFirst).not.toHaveBeenCalled();
    });

    it('skips browse photo gates when an active mutual exists', async () => {
      mockBrowsePhotoFileAccess({
        viewerPhotoCount: 0,
        candidatePhotoCount: 0,
        mutual: true,
      });
      prisma.userProfilePhoto.findFirst.mockResolvedValue({
        mimeType: 'image/jpeg',
        storageKey: 'uploads/key.jpg',
      });
      photoStorage.read.mockResolvedValue(Buffer.from([1, 2]));

      await expect(
        service.getPrimaryPhotoFileById(viewerUserId, candidateProfileId, photoId),
      ).resolves.toEqual({
        contentType: 'image/jpeg',
        content: Buffer.from([1, 2]),
      });
    });
  });
});
