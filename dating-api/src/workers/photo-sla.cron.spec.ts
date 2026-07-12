import { UserProfilePhotoStatus } from '@prisma/client';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import type { PrismaService } from '../prisma/prisma.service';
import { PhotoSlaEnforcer } from './photo-sla.cron';

describe('PhotoSlaEnforcer', () => {
  const prisma = {
    userProfilePhoto: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const moderation = {
    applyOutcome: jest.fn().mockResolvedValue(true),
  } as unknown as PhotoModerationService;

  const obs = { trace: jest.fn() } as unknown as StructuredObservabilityService;

  const prevEnv: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string | undefined) {
    if (!(key in prevEnv)) prevEnv[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  let enforcer: PhotoSlaEnforcer;

  beforeEach(() => {
    jest.clearAllMocks();
    setEnv('NSFW_FLAG_THRESHOLD', '50');
    setEnv('PHOTO_MODERATION_SLA_LOW_HOURS', '6');
    setEnv('PHOTO_MODERATION_SLA_MAX_HOURS', '24');
    setEnv('PHOTO_MODERATION_SLA_LOW_CONFIDENCE', '60');
    setEnv('PHOTO_MODERATION_SLA_ALERT_PER_DAY', '20');
    setEnv('PHOTO_MODERATION_ML_STUCK_MINUTES', '15');
    enforcer = new PhotoSlaEnforcer(prisma, moderation, obs);
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function hoursAgo(h: number): Date {
    return new Date(Date.now() - h * 60 * 60 * 1000);
  }

  it('Rule A: auto-approves NSFW mid-band low confidence after 6h', async () => {
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([]) // stuck pending
      .mockResolvedValueOnce([
        {
          id: 'photo_nsfw',
          profileId: 'prof_1',
          createdAt: hoursAgo(7),
          moderationResultJson: {
            source: 'ml',
            decision: 'flagged',
            mlConfidence: 55,
            mlLabels: ['Suggestive'],
          },
          profile: { userId: 'user_1' },
        },
      ])
      .mockResolvedValueOnce([]); // capacity count

    const res = await enforcer.runHourly();
    expect(res.autoApproved).toBe(1);
    expect(moderation.applyOutcome).toHaveBeenCalledWith(
      'photo_nsfw',
      'prof_1',
      'user_1',
      expect.objectContaining({
        status: 'APPROVED',
        result: expect.objectContaining({ slaRule: 'flagged_6h_low' }),
      }),
      expect.objectContaining({
        expectedStatuses: [UserProfilePhotoStatus.FLAGGED_FOR_REVIEW],
      }),
    );
  });

  it('Rule A: does NOT auto-approve no_face flags (confidence 0)', async () => {
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'photo_noface',
          profileId: 'prof_1',
          createdAt: hoursAgo(7),
          moderationResultJson: {
            source: 'ml',
            decision: 'flagged',
            mlConfidence: 0,
            mlLabels: [],
            rejectionReasonCode: 'no_face',
            faceCount: 0,
          },
          profile: { userId: 'user_1' },
        },
      ]);

    const res = await enforcer.runHourly();
    expect(res.autoApproved).toBe(0);
    expect(moderation.applyOutcome).not.toHaveBeenCalled();
  });

  it('Rule A: does NOT auto-approve ml_timeout error flags before 24h', async () => {
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'photo_err',
          profileId: 'prof_1',
          createdAt: hoursAgo(7),
          moderationResultJson: {
            source: 'ml',
            decision: 'flagged',
            error: 'ml_timeout',
          },
          profile: { userId: 'user_1' },
        },
      ]);

    const res = await enforcer.runHourly();
    expect(res.autoApproved).toBe(0);
  });

  it('Rule B: auto-approves any flagged photo after 24h including no_face', async () => {
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'photo_old',
          profileId: 'prof_1',
          createdAt: hoursAgo(25),
          moderationResultJson: {
            source: 'ml',
            decision: 'flagged',
            mlConfidence: 0,
            rejectionReasonCode: 'no_face',
          },
          profile: { userId: 'user_1' },
        },
      ])
      .mockResolvedValueOnce([]);

    const res = await enforcer.runHourly();
    expect(res.autoApproved).toBe(1);
    expect(obs.trace).toHaveBeenCalled();
  });

  it('flags stuck PENDING rekognition jobs', async () => {
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'photo_stuck',
          profileId: 'prof_1',
          createdAt: hoursAgo(1),
          moderationResultJson: null,
          profile: { userId: 'user_1' },
        },
      ])
      .mockResolvedValueOnce([]);

    const res = await enforcer.runHourly();
    expect(res.flaggedStuck).toBe(1);
    expect(moderation.applyOutcome).toHaveBeenCalledWith(
      'photo_stuck',
      'prof_1',
      'user_1',
      expect.objectContaining({
        status: 'FLAGGED_FOR_REVIEW',
        result: expect.objectContaining({ error: 'ml_timeout' }),
      }),
      expect.objectContaining({
        expectedStatuses: [UserProfilePhotoStatus.PENDING],
      }),
    );
  });
});
