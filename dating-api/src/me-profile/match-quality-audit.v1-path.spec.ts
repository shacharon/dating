/**
 * Match quality audit must stay on the V1 MeMatchesService path only.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MeMatchDetailDto } from './me-matches.service';
import { buildMatchQualityAuditJson } from './match-quality-audit';
import type { PrismaService } from '../prisma/prisma.service';

describe('match-quality-audit (V1 path only)', () => {
  const auditSrcPath = path.join(__dirname, 'match-quality-audit.ts');
  const cliSrcPath = path.join(__dirname, '..', '..', 'scripts', 'match-quality-audit.ts');

  it('audit module does not reference legacy candidate list or direct engine compare', () => {
    const text = fs.readFileSync(auditSrcPath, 'utf8');
    expect(text).not.toContain('MeProfileMatchesService');
    expect(text).not.toContain('me-profile-matches.service');
    expect(text).not.toContain('compareWithStatus');
    expect(text).not.toContain('ProfilesPrismaService');
    expect(text).not.toContain('MatchmakingProfile');
  });

  it('CLI script wires MeMatchesService + audit builder only', () => {
    const text = fs.readFileSync(cliSrcPath, 'utf8');
    expect(text).toContain('MeMatchesService');
    expect(text).toContain('buildMatchQualityAuditJson');
    expect(text).not.toContain('MeProfileMatchesService');
    expect(text).not.toContain('compareWithStatus');
  });

  it('buildMatchQualityAuditJson uses getById first, then optional list()', async () => {
    const callOrder: string[] = [];

    const detail: MeMatchDetailDto = {
      id: 'cand_prof',
      gender: 'FEMALE',
      ageYears: 30,
      locationLabel: 'X',
      analyzedAt: '2026-01-01T00:00:00.000Z',
      hasEvaluation: true,
      evaluationSummary: 'Summary',
      matchScore: 81,
      profileAnalysisStale: false,
      matchExplanationTraits: [
        {
          group: 'Lifestyle match',
          label: 'Social rhythm',
          evidence: 'Your social energy levels are well-matched.',
          strength: 'moderate',
        },
      ],
      primaryPhotoUrl: null,
      approvedPhotoCount: 0,
      explainability: {
        positiveChips: ['Social rhythm'],
        reasonShort: 'Compatible',
      },
      recommendation: {
        explainability: {
          positiveChips: ['Social rhythm'],
          reasonShort: 'Compatible',
        },
        primaryTakeaway: 'Good fit',
        suggestedNextAction: 'Say hi',
      },
    };

    const getById = jest.fn(async () => {
      callOrder.push('getById');
      return detail;
    });

    const list = jest.fn(async () => {
      callOrder.push('list');
      return {
        status: 'ready' as const,
        viewerProfileId: 'viewer_prof',
        matches: [{ id: 'cand_prof' }],
      };
    });

    let findUniqueCall = 0;
    const prisma = {
      userProfile: {
        findUnique: jest.fn(async () => {
          callOrder.push(`findUnique:${findUniqueCall++}`);
          return {
            id: findUniqueCall === 1 ? 'viewer_prof' : 'cand_prof',
            signals: [] as { signalKey: string; signalValue: number; evalVersion: string }[],
            interests: [] as { tag: string; rank: number; evalVersion: string }[],
          };
        }),
      },
      userProfileEvaluation: {
        findFirst: jest.fn(async () => ({
          version: 'v1',
          evaluationJson: {},
          createdAt: new Date(),
        })),
      },
    } as unknown as PrismaService;

    const report = await buildMatchQualityAuditJson({
      viewerUserId: 'user_1',
      candidateProfileId: 'cand_prof',
      meMatches: { getById, list },
      prisma,
      engineReadNormalized: false,
      includeListContext: true,
    });

    expect(callOrder[0]).toBe('getById');
    expect(getById).toHaveBeenCalledWith('user_1', 'cand_prof');
    expect(list).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledWith('user_1');
    expect(report.compare.outcome).toBe('scored');
    expect(report.matchExplanationTraits).toEqual([
      {
        group: 'Lifestyle match',
        label: 'Social rhythm',
        evidence: 'Your social energy levels are well-matched.',
        strength: 'moderate',
      },
    ]);
    expect(report.engineInputSource.viewer).toBe('evaluationJson');
    expect(report.engineInputSource.candidate).toBe('evaluationJson');
  });

  it('does not call list() when includeListContext is false', async () => {
    const detail: MeMatchDetailDto = {
      id: 'cand_prof',
      gender: null,
      ageYears: null,
      locationLabel: null,
      analyzedAt: null,
      hasEvaluation: true,
      evaluationSummary: null,
      matchScore: null,
      primaryPhotoUrl: null,
      approvedPhotoCount: 0,
      explainability: null,
      recommendation: null,
    };

    const getById = jest.fn(async () => detail);
    const list = jest.fn();

    const prisma = {
      userProfile: {
        findUnique: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'viewer_prof',
            signals: [],
            interests: [],
          })
          .mockResolvedValueOnce({
            id: 'cand_prof',
            signals: [],
            interests: [],
          }),
      },
      userProfileEvaluation: {
        findFirst: jest.fn(async () => ({ version: 'v1' })),
      },
    } as unknown as PrismaService;

    await buildMatchQualityAuditJson({
      viewerUserId: 'user_1',
      candidateProfileId: 'cand_prof',
      meMatches: { getById, list },
      prisma,
      engineReadNormalized: false,
      includeListContext: false,
    });

    expect(list).not.toHaveBeenCalled();
  });
});
