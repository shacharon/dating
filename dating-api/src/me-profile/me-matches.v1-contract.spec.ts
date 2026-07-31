/**
 * Match Engine V1 contract tests — see `docs/MATCH_ENGINE_V1_CONTRACT.md`.
 * Assertions only; no scoring / schema / UI changes.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UserProfileStatus } from '@prisma/client';
import type { AnalyticsService } from '../analytics/analytics.service';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PrismaService } from '../prisma/prisma.service';
import * as holyGrailPair from '../matches/holy-grail-pair-directions';
import * as matchEngine from '../matches/match-engine';
import { MeMatchesService } from './me-matches.service';

const S_ANALYZED = 'ANALYZED' as UserProfileStatus;

const viewerUserId = 'user_v1_contract_viewer';
const viewerProfileId = 'prof_v1_contract_viewer';
const candidateProfileId = 'prof_v1_contract_cand';

function defaultLatestEval(profileId: string) {
  return {
    id: `eval_${profileId}`,
    profileId,
    version: 'v1',
    evaluationJson: {
      self: { signals: { ambition: 0.6, socialBattery: 0.5, emotionalDepth: 0.7 } },
      partner: { signals: {} },
      relationship: { signals: {} },
      display: { summary: 'Summary line.' },
    },
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
  };
}

function makeProfileRow(overrides: {
  id: string;
  userId: string;
  gender?: string | null;
  desiredPartnerGenders?: unknown;
  updatedAt?: Date;
}) {
  return {
    id: overrides.id,
    userId: overrides.userId,
    name: `Profile ${overrides.id}`,
    nickname: null as string | null,
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
    updatedAt: overrides.updatedAt ?? new Date('2026-04-01T10:00:00.000Z'),
    _count: { evaluations: 1 },
    childrenStatus: null as string | null,
    wantsChildren: null as string | null,
    smokingFrequency: null as string | null,
    alcoholUse: null as string | null,
    education: null as string | null,
    religion: null as string | null,
    preference: null,
    photos: [{ id: 'photo_v1', isPrimary: true }] as Array<{ id: string; isPrimary: boolean }>,
    signals: [] as Array<{ signalKey: string; signalValue: number; evalVersion: string }>,
    interests: [] as Array<{ tag: string; rank: number; evalVersion: string }>,
  };
}

describe('MATCH_ENGINE_V1_CONTRACT (docs + runtime shape)', () => {
  const contractMdPath = path.join(
    __dirname,
    '..',
    '..',
    'docs',
    'MATCH_ENGINE_V1_CONTRACT.md',
  );

  it('contract markdown exists', () => {
    expect(fs.existsSync(contractMdPath)).toBe(true);
    const text = fs.readFileSync(contractMdPath, 'utf8');
    expect(text).toContain('GET /api/v1/me/matches');
    expect(text).toContain('buildMeMatchesParticipantReadModel');
    expect(text).toContain('evalVersion');
    expect(text).toContain('filteredNoPhotoCandidates');
    expect(text).toContain('Candidate has no approved photo');
  });

  describe('MeMatchesService read-model import policy (V1)', () => {
    const serviceSrc = fs.readFileSync(
      path.join(__dirname, 'me-matches.service.ts'),
      'utf8',
    );

    it('does not import low-level mapper builders', () => {
      expect(serviceSrc).not.toContain('buildProfilePayloadFromNewModel');
      expect(serviceSrc).not.toContain('buildChildrenUnsureRowFromNewModel');
    });

    it('does not reference evaluationJson identifier in the service module', () => {
      expect(serviceSrc).not.toMatch(/\bevaluationJson\b/);
    });

    it('imports only buildMeMatchesParticipantReadModel from me-profile-engine.mapper', () => {
      const importLine = serviceSrc
        .split('\n')
        .find((l) => l.includes("from './me-profile-engine.mapper'"));
      expect(importLine).toBeDefined();
      expect(importLine).toContain('buildMeMatchesParticipantReadModel');
      expect(importLine!.split('{')[1]?.split('}')[0]?.trim()).toBe(
        'buildMeMatchesParticipantReadModel',
      );
    });
  });

  describe('V1 list vs detail DTO fields', () => {
    let prisma: {
      userProfile: { findUnique: jest.Mock; findMany: jest.Mock; count: jest.Mock };
      userProfileEvaluation: { findFirst: jest.Mock };
      userProfilePhoto: { findFirst: jest.Mock; count: jest.Mock };
      matchAction: { findUnique: jest.Mock; findMany: jest.Mock };
      mutualMatch: { findMany: jest.Mock };
    };
    let service: MeMatchesService;

    beforeEach(() => {
      prisma = {
        userProfile: {
          findUnique: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
          count: jest.fn().mockResolvedValue(0),
        },
        userProfileEvaluation: {
          findFirst: jest
            .fn()
            .mockImplementation(
              ({ where: { profileId } }: { where: { profileId: string } }) =>
                Promise.resolve(defaultLatestEval(profileId)),
            ),
        },
        userProfilePhoto: {
          findFirst: jest.fn(),
          count: jest.fn().mockResolvedValue(1),
        },
        matchAction: {
          findUnique: jest.fn().mockResolvedValue(null),
          findMany: jest.fn().mockResolvedValue([]),
        },
        mutualMatch: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      };
      const obs: jest.Mocked<Pick<StructuredObservabilityService, 'trace' | 'error'>> = {
        trace: jest.fn(),
        error: jest.fn(),
      };
      const photoStorage = { read: jest.fn() };
      const mutualMatches = { findActiveByUserPair: jest.fn().mockResolvedValue(null) };
      const analytics = { track: jest.fn() } as unknown as AnalyticsService;
      service = new MeMatchesService(
        prisma as unknown as PrismaService,
        obs as unknown as StructuredObservabilityService,
        photoStorage as never,
        mutualMatches as never,
        analytics,
        {
          get: jest.fn().mockResolvedValue(null),
          set: jest.fn(),
          del: jest.fn(),
        } as never,
        { generate: jest.fn().mockResolvedValue({ narrative: 'n', source: 'fallback', promptVersion: 'v1' }) } as never,
        { find: jest.fn().mockResolvedValue(null), upsert: jest.fn().mockResolvedValue(undefined) } as never,
      );
    });

    it('list match rows do not include evaluationSummary or matchExplanationTraits', async () => {
      const viewer = makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
      });
      const candidate = makeProfileRow({
        id: candidateProfileId,
        userId: 'user_cand',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      });
      prisma.userProfile.findUnique.mockResolvedValue(viewer);
      prisma.userProfile.findMany.mockResolvedValue([candidate]);

      const exp = {
        positiveChips: ['Emotional depth'],
        reasonShort: 'Reason',
      };
      const cmpSpy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: exp,
        recommendation: {
          explainability: exp,
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
        },
      } as never);
      const hgSpy = jest
        .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
        .mockReturnValue(null);
      try {
        const result = await service.list(viewerUserId);
        expect(result.status).toBe('ready');
        expect(result.matches).toHaveLength(1);
        expect(typeof result.viewerProfileAnalysisStale).toBe('boolean');
        expect(result.viewerProfileAnalysisStale).toBe(false);
        const row = result.matches![0];
        expect(row).not.toHaveProperty('evaluationSummary');
        expect(row).not.toHaveProperty('matchExplanationTraits');
        expect(row).not.toHaveProperty('matchNarrative');
      } finally {
        cmpSpy.mockRestore();
        hgSpy.mockRestore();
      }
    });

    it('ready list includes viewerProfileAnalysisStale true when viewer updated after latest eval', async () => {
      const viewer = makeProfileRow({
        id: viewerProfileId,
        userId: viewerUserId,
        gender: 'MALE',
        desiredPartnerGenders: ['FEMALE'],
        updatedAt: new Date('2026-05-10T10:00:00.000Z'),
      });
      const candidate = makeProfileRow({
        id: candidateProfileId,
        userId: 'user_cand',
        gender: 'FEMALE',
        desiredPartnerGenders: ['MALE'],
      });
      prisma.userProfile.findUnique.mockResolvedValue(viewer);
      prisma.userProfile.findMany.mockResolvedValue([candidate]);
      prisma.userProfileEvaluation.findFirst.mockImplementation(
        ({ where: { profileId } }: { where: { profileId: string } }) => {
          if (profileId === viewerProfileId) {
            return Promise.resolve({
              ...defaultLatestEval(viewerProfileId),
              createdAt: new Date('2026-04-01T10:00:00.000Z'),
            });
          }
          return Promise.resolve(defaultLatestEval(profileId));
        },
      );

      const cmpSpy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: {
          positiveChips: ['Emotional depth'],
          reasonShort: 'Reason',
        },
        recommendation: {
          explainability: {
            positiveChips: ['Emotional depth'],
            reasonShort: 'Reason',
          },
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
        },
      } as never);
      const hgSpy = jest
        .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
        .mockReturnValue(null);
      try {
        const result = await service.list(viewerUserId);
        expect(result.status).toBe('ready');
        expect(result.viewerProfileAnalysisStale).toBe(true);
      } finally {
        cmpSpy.mockRestore();
        hgSpy.mockRestore();
      }
    });

    it('detail may include matchExplanationTraits when compareWithStatus returns scored explainability', async () => {
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
      const cmpSpy = jest.spyOn(matchEngine, 'compareWithStatus').mockReturnValue({
        finalScore: 72,
        explainability: exp,
        recommendation: {
          explainability: exp,
          primaryTakeaway: 'Take',
          suggestedNextAction: 'Next',
        },
      } as never);
      const hgSpy = jest
        .spyOn(holyGrailPair, 'evaluateHolyGrailPairDirections')
        .mockReturnValue(null);
      try {
        const detail = await service.getById(viewerUserId, candidateProfileId);
        expect(detail).not.toHaveProperty('viewerProfileAnalysisStale');
        expect(detail.matchExplanationTraits).toBeDefined();
        expect(detail.matchExplanationTraits!.length).toBeGreaterThan(0);
        expect(detail.evaluationSummary).toBe('Summary line.');
        expect(typeof detail.matchNarrative).toBe('string');
        expect(detail.matchNarrative!.length).toBeGreaterThan(0);
      } finally {
        cmpSpy.mockRestore();
        hgSpy.mockRestore();
      }
    });
  });
});
