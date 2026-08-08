import { UserProfilePhotoStatus } from '@prisma/client';
import type { RedisCacheService } from '../cache/redis-cache.service';
import { ErrorCodes } from '../logging/error-codes';
import type { StructuredObservabilityService } from '../logging/structured-observability.service';
import type { PhotoModerationService } from '../photo-storage/photo-moderation.service';
import type { PrismaService } from '../prisma/prisma.service';
import {
  CRON_LOCK_PHOTO_SLA,
  PHOTO_SLA_LOCK_TTL_SECONDS,
} from './cron-leader.lock';
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

  const cache = {
    tryAcquireCronLock: jest.fn().mockResolvedValue('acquired'),
  } as unknown as RedisCacheService;

  const prevEnv: Record<string, string | undefined> = {};

  function setEnv(key: string, value: string | undefined) {
    if (!(key in prevEnv)) prevEnv[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  let enforcer: PhotoSlaEnforcer;

  beforeEach(() => {
    jest.clearAllMocks();
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('acquired');
    setEnv('CRON_LEADER_FAIL_OPEN', undefined);
    setEnv('NSFW_FLAG_THRESHOLD', '50');
    setEnv('PHOTO_MODERATION_SLA_LOW_HOURS', '6');
    setEnv('PHOTO_MODERATION_SLA_MAX_HOURS', '24');
    setEnv('PHOTO_MODERATION_SLA_LOW_CONFIDENCE', '60');
    setEnv('PHOTO_MODERATION_SLA_ALERT_PER_DAY', '20');
    setEnv('PHOTO_MODERATION_ML_STUCK_MINUTES', '15');
    enforcer = new PhotoSlaEnforcer(prisma, moderation, obs, cache);
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

  it('skips work when lock not_acquired', async () => {
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('not_acquired');
    await expect(enforcer.runHourly()).resolves.toEqual({
      autoApproved: 0,
      flaggedStuck: 0,
    });
    expect(prisma.userProfilePhoto.findMany).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
      ErrorCodes.CRON_LEADER_SKIPPED,
    );
  });

  it('skips work when lock unavailable', async () => {
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('unavailable');
    await expect(enforcer.runHourly()).resolves.toEqual({
      autoApproved: 0,
      flaggedStuck: 0,
    });
    expect(prisma.userProfilePhoto.findMany).not.toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      expect.stringContaining('skipped'),
      ErrorCodes.CRON_LEADER_UNAVAILABLE,
    );
  });

  it('runs when lock unavailable but CRON_LEADER_FAIL_OPEN=1', async () => {
    setEnv('CRON_LEADER_FAIL_OPEN', '1');
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('unavailable');
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await expect(enforcer.runHourly()).resolves.toEqual({
      autoApproved: 0,
      flaggedStuck: 0,
    });
    expect(prisma.userProfilePhoto.findMany).toHaveBeenCalled();
    expect(obs.trace).toHaveBeenCalledWith(
      'photo-sla cron leader acquired',
      ErrorCodes.CRON_LEADER_ACQUIRED,
    );
    setEnv('CRON_LEADER_FAIL_OPEN', undefined);
  });

  it('does not fail-open when lock not_acquired even with CRON_LEADER_FAIL_OPEN', async () => {
    setEnv('CRON_LEADER_FAIL_OPEN', '1');
    (cache.tryAcquireCronLock as jest.Mock).mockResolvedValue('not_acquired');
    await expect(enforcer.runHourly()).resolves.toEqual({
      autoApproved: 0,
      flaggedStuck: 0,
    });
    expect(prisma.userProfilePhoto.findMany).not.toHaveBeenCalled();
    setEnv('CRON_LEADER_FAIL_OPEN', undefined);
  });

  it('acquires lock with photo-sla key and 3300s TTL', async () => {
    prisma.userProfilePhoto.findMany = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    await enforcer.runHourly();
    expect(cache.tryAcquireCronLock).toHaveBeenCalledWith(
      CRON_LOCK_PHOTO_SLA,
      PHOTO_SLA_LOCK_TTL_SECONDS,
      expect.objectContaining({
        pid: process.pid,
        at: expect.any(String),
        host: expect.any(String),
      }),
    );
  });

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
    expect(obs.trace).toHaveBeenCalledWith(
      'photo-sla cron leader acquired',
      ErrorCodes.CRON_LEADER_ACQUIRED,
    );
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
