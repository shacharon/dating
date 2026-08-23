/**
 * Sub-split from me-profile.service.spec.ts (Sprint 69 Story 03).
 * getLatestAnalysisForUser
 */
import { NotFoundException } from '@nestjs/common';
import {
  createMeProfileServiceTestContext,
  type MeProfileServiceTestContext,
} from './me-profile.service.spec-support';
import type { MeProfileService } from './me-profile.service';

describe('MeProfileService — analysis', () => {
  let service: MeProfileService;
  let prisma: MeProfileServiceTestContext['prisma'];
  let userId: string;
  let baseRow: MeProfileServiceTestContext['baseRow'];
  let obs: MeProfileServiceTestContext['obs'];

  beforeEach(() => {
    ({ service, prisma, userId, baseRow, obs } =
      createMeProfileServiceTestContext());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getLatestAnalysisForUser', () => {
    it('throws NotFoundException when profile missing', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(null);
      await expect(service.getLatestAnalysisForUser(userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.userProfileEvaluation.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when no UserProfileEvaluation row exists', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue(null);

      await expect(service.getLatestAnalysisForUser(userId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
        where: { profileId: 'prof_1' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(obs.trace).not.toHaveBeenCalledWith(
        expect.stringContaining('me profile latest analysis'),
        'ME_PROFILE_ANALYSIS_LATEST_OK',
      );
    });

    it('returns latest evaluation snapshot when row exists', async () => {
      const createdAt = new Date('2026-04-15T14:00:00.000Z');
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'upeval_1',
        profileId: 'prof_1',
        version: 'v1',
        evaluationJson: { ok: true, self: {} },
        createdAt,
      });

      const r = await service.getLatestAnalysisForUser(userId);

      expect(prisma.userProfileEvaluation.findFirst).toHaveBeenCalledWith({
        where: { profileId: 'prof_1' },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(r.userProfileId).toBe('prof_1');
      expect(r.evaluationId).toBe('upeval_1');
      expect(r.createdAt).toBe(createdAt.toISOString());
      expect(r.evaluationJson).toEqual({ ok: true, self: {} });
    });

    it('returns only the single row from latestEvaluationForProfile (no merge with older evaluations)', async () => {
      prisma.userProfile.findUnique.mockResolvedValue(baseRow);
      prisma.userProfileEvaluation.findFirst.mockResolvedValue({
        id: 'eval_latest_only',
        profileId: 'prof_1',
        version: 'v1',
        evaluationJson: { run: 'latest' },
        createdAt: new Date('2026-06-01T12:00:00.000Z'),
      });

      const r = await service.getLatestAnalysisForUser(userId);

      expect(r.evaluationId).toBe('eval_latest_only');
      expect(r.evaluationJson).toEqual({ run: 'latest' });
    });
  });
});
