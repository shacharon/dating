import {
  loadPhotoStorageConfig,
  type PhotoStorageConfig,
} from './photo-storage.config';

export type PhotoModerationThresholds = {
  flagThreshold: number;
  rejectThreshold: number;
  faceDetectionEnabled: boolean;
  storageDriver: PhotoStorageConfig['storageDriver'];
  moderationDriver: PhotoStorageConfig['moderationDriver'];
  s3Bucket: string | undefined;
  awsRegion: string;
  slaLowHours: number;
  slaMaxHours: number;
  slaLowConfidence: number;
  slaAlertPerDay: number;
  mlStuckMinutes: number;
};

function parseNumber(raw: string | undefined, fallback: number): number {
  if (!raw?.trim()) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export function loadPhotoModerationThresholds(
  env: NodeJS.ProcessEnv = process.env,
): PhotoModerationThresholds {
  const storage = loadPhotoStorageConfig(env);
  return {
    flagThreshold: parseNumber(env.NSFW_FLAG_THRESHOLD, 50),
    rejectThreshold: parseNumber(env.NSFW_AUTO_REJECT_THRESHOLD, 80),
    faceDetectionEnabled: storage.faceDetectionEnabled,
    storageDriver: storage.storageDriver,
    moderationDriver: storage.moderationDriver,
    s3Bucket: env.PHOTO_S3_BUCKET?.trim() || undefined,
    awsRegion:
      env.PHOTO_S3_REGION?.trim() ||
      env.AWS_REGION?.trim() ||
      'us-east-1',
    slaLowHours: parseNumber(env.PHOTO_MODERATION_SLA_LOW_HOURS, 6),
    slaMaxHours: parseNumber(env.PHOTO_MODERATION_SLA_MAX_HOURS, 24),
    slaLowConfidence: parseNumber(env.PHOTO_MODERATION_SLA_LOW_CONFIDENCE, 60),
    slaAlertPerDay: parseNumber(env.PHOTO_MODERATION_SLA_ALERT_PER_DAY, 20),
    mlStuckMinutes: parseNumber(env.PHOTO_MODERATION_ML_STUCK_MINUTES, 15),
  };
}
