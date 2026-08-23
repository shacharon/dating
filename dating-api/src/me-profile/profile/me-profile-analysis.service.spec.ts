import { UserProfileStatus } from '@prisma/client';
import type { EvaluateService } from '../../evaluate/evaluate.service';
import type { StructuredObservabilityService } from '../../logging/structured-observability.service';
import {
  buildAnalysisContext,
  EVALUATION_VERSION,
  mapDbFirstColumnsFromEvaluation,
  MeProfileAnalysisService,
} from './me-profile-analysis.service';
import type { IUserProfileRepository } from '../repositories/user-profile.repository';

const baseRow = {
  id: 'prof_analysis_1',
  userId: 'user_analysis_1',
  status: UserProfileStatus.SUBMITTED,
  onboardingStep: 'BASIC',
  name: '',
  nickname: null,
  aboutMe: 'I love hiking',
  aboutPartner: 'Looking for kindness',
  aboutRelationship: 'Long term',
  birthDate: new Date('1990-01-01T00:00:00.000Z'),
  gender: 'MALE',
  desiredPartnerGenders: ['FEMALE'],
  city: 'TLV',
  country: 'IL',
  locationLabel: 'Tel Aviv, IL',
  submittedAt: new Date(),
  analyzedAt: null,
  lastAnalysisError: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('MeProfileAnalysisService', () => {
  let profiles: jest.Mocked<
    Pick<
      IUserProfileRepository,
      | 'findByUserId'
      | 'markAnalyzing'
      | 'markAnalysisFailed'
      | 'persistAnalysisSuccess'
    >
  >;
  let evaluate: jest.Mocked<Pick<EvaluateService, 'evaluateBatch'>>;
  let obs: jest.Mocked<Pick<StructuredObservabilityService, 'trace' | 'error'>>;
  let service: MeProfileAnalysisService;

  beforeEach(() => {
    profiles = {
      findByUserId: jest.fn(),
      markAnalyzing: jest.fn().mockResolvedValue(undefined),
      markAnalysisFailed: jest.fn().mockResolvedValue(undefined),
      persistAnalysisSuccess: jest.fn().mockResolvedValue(undefined),
    };
    evaluate = { evaluateBatch: jest.fn() };
    obs = { trace: jest.fn(), error: jest.fn() };
    service = new MeProfileAnalysisService(
      profiles as unknown as IUserProfileRepository,
      evaluate as unknown as EvaluateService,
      obs as unknown as StructuredObservabilityService,
    );
  });

  it('skips when profile is missing', async () => {
    profiles.findByUserId.mockResolvedValue(null);

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'skipped',
    });
    expect(profiles.markAnalyzing).not.toHaveBeenCalled();
    expect(evaluate.evaluateBatch).not.toHaveBeenCalled();
  });

  it.each([
    UserProfileStatus.DRAFT,
    UserProfileStatus.ANALYZING,
    UserProfileStatus.FAILED,
  ])('skips when profile status is %s', async (status) => {
    profiles.findByUserId.mockResolvedValue({
      ...baseRow,
      status,
    } as never);

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'skipped',
    });
    expect(profiles.markAnalyzing).not.toHaveBeenCalled();
  });

  it('treats an already analyzed profile as success', async () => {
    profiles.findByUserId.mockResolvedValue({
      ...baseRow,
      status: UserProfileStatus.ANALYZED,
    } as never);

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'success',
    });
    expect(evaluate.evaluateBatch).not.toHaveBeenCalled();
  });

  it('persists analysis success through the profile port', async () => {
    profiles.findByUserId.mockResolvedValue(baseRow as never);
    const result = {
      self: {
        signals: {
          emotionalDepth: 7,
          lifestylePace: 5,
          conflictStyle: 8,
          independence: 6,
          socialBattery: 9,
        },
      },
      partner: {},
      relationship: {},
      enrichment: {
        signals: { interestsTop3: ['Hiking', 'Coffee', 'Travel'] },
      },
    };
    evaluate.evaluateBatch.mockResolvedValue({
      ok: true,
      result,
    } as never);

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'success',
    });

    expect(profiles.markAnalyzing).toHaveBeenCalledWith(baseRow.userId);
    expect(evaluate.evaluateBatch).toHaveBeenCalledWith({
      aboutMe: baseRow.aboutMe,
      aboutPartner: baseRow.aboutPartner,
      aboutRelationship: baseRow.aboutRelationship,
      profileId: baseRow.id,
    });
    expect(profiles.persistAnalysisSuccess).toHaveBeenCalledWith({
      userId: baseRow.userId,
      profileId: baseRow.id,
      dbFirstColumns: {
        interestsTop: ['hiking', 'coffee', 'travel'],
        sigEmotionalDepth: 7,
        sigLifestylePace: 5,
        sigConflictStyle: 8,
        sigIndependence: 6,
        sigSocialBattery: 9,
      },
      evaluationVersion: EVALUATION_VERSION,
      evaluationJson: result,
      signals: [
        {
          signalKey: 'emotionalDepth',
          signalValue: 7,
          evalVersion: EVALUATION_VERSION,
        },
        {
          signalKey: 'lifestylePace',
          signalValue: 5,
          evalVersion: EVALUATION_VERSION,
        },
        {
          signalKey: 'conflictStyle',
          signalValue: 8,
          evalVersion: EVALUATION_VERSION,
        },
        {
          signalKey: 'independence',
          signalValue: 6,
          evalVersion: EVALUATION_VERSION,
        },
        {
          signalKey: 'socialBattery',
          signalValue: 9,
          evalVersion: EVALUATION_VERSION,
        },
      ],
      interests: [
        {
          tag: 'hiking',
          rank: 1,
          source: 'enrichment',
          evalVersion: EVALUATION_VERSION,
        },
        {
          tag: 'coffee',
          rank: 2,
          source: 'enrichment',
          evalVersion: EVALUATION_VERSION,
        },
        {
          tag: 'travel',
          rank: 3,
          source: 'enrichment',
          evalVersion: EVALUATION_VERSION,
        },
      ],
    });
  });

  it('marks analysis failed when evaluation throws', async () => {
    profiles.findByUserId.mockResolvedValue(baseRow as never);
    const error = new Error('LLM timeout');
    evaluate.evaluateBatch.mockRejectedValue(error);

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'failed',
    });
    expect(profiles.markAnalysisFailed).toHaveBeenCalledWith(
      baseRow.userId,
      'LLM timeout',
    );
    expect(obs.error).toHaveBeenCalledWith(
      expect.stringContaining('analysis failed'),
      'ME_PROFILE_ANALYSIS_FAILED',
      error,
    );
  });

  it('returns failed without evaluating when markAnalyzing fails', async () => {
    profiles.findByUserId.mockResolvedValue(baseRow as never);
    profiles.markAnalyzing.mockRejectedValue(new Error('db down'));

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'failed',
    });
    expect(evaluate.evaluateBatch).not.toHaveBeenCalled();
  });

  it('swallows a failed best-effort markAnalysisFailed call', async () => {
    profiles.findByUserId.mockResolvedValue(baseRow as never);
    evaluate.evaluateBatch.mockRejectedValue(new Error('boom'));
    profiles.markAnalysisFailed.mockRejectedValue(new Error('db down'));

    await expect(service.runForUser(baseRow.userId)).resolves.toEqual({
      status: 'failed',
    });
  });
});

describe('analysis mappers', () => {
  it('builds context and defaults nullable text', () => {
    const ctx = buildAnalysisContext({
      ...baseRow,
      aboutMe: null,
      aboutPartner: null,
      aboutRelationship: null,
    } as never);
    expect(ctx).toEqual(
      expect.objectContaining({
        profileId: baseRow.id,
        aboutMe: '',
        aboutPartner: '',
        aboutRelationship: '',
      }),
    );
  });

  it('maps denormalized columns and rejects invalid signals', () => {
    const mapped = mapDbFirstColumnsFromEvaluation({
      self: {
        signals: {
          emotionalDepth: 11,
          lifestylePace: 4,
          conflictStyle: null,
        },
      },
      partner: {},
      relationship: {},
      extendedSignals: {
        interests: ['  Art ', 'Travel', 'Food', 'Extra'],
      },
    } as never);
    expect(mapped).toEqual({
      interestsTop: ['art', 'travel', 'food'],
      sigEmotionalDepth: null,
      sigLifestylePace: 4,
      sigConflictStyle: null,
      sigIndependence: null,
      sigSocialBattery: null,
    });
  });
});
